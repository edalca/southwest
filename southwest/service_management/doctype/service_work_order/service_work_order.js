frappe.ui.form.on("Service Work Order Item", {
	item_code(_frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (!row.item_code) return;

		frappe.db.get_value("Item", row.item_code, ["item_name", "custom_component"], (r) => {
			if (!r) return;
			if (r.item_name) frappe.model.set_value(cdt, cdn, "description", r.item_name);
			if (r.custom_component)
				frappe.model.set_value(cdt, cdn, "part_number", r.custom_component);
		});
	},
});

frappe.ui.form.on("Service Work Order", {
	setup(frm) {
		southwest.utils.set_default_company(frm);

		frm.set_query("equipment_selection", function (doc) {
			return {
				query: "southwest.service_management.doctype.service_work_order.service_work_order.get_valid_equipment_for_customer",
				filters: {
					customer: doc.customer,
					ref_date: doc.scheduled_date || frappe.datetime.nowdate(),
				},
			};
		});
	},

	refresh(frm) {
		set_status_indicator(frm);
		set_form_state(frm);
		set_status_buttons(frm);
	},

	customer(frm) {
		frm.set_value("equipment_selection", []);
		if (frm.doc.customer) {
			frappe.call({
				method: "southwest.api.get_active_customer_po",
				args: { customer: frm.doc.customer },
				callback: function (r) {
					if (r.message) {
						frm.set_value("po_number", r.message);
					}
				},
			});
		}
	},

	equipment_selection(frm) {
		if (!["PM Frequency", "Labor Rate"].includes(frm.doc.service_type)) return;
		const rows = frm.doc.equipment_selection || [];
		if (rows.length > 1) {
			frm.doc.equipment_selection = rows.slice(0, 1);
			frm.refresh_field("equipment_selection");
			frappe.msgprint(
				__("Only one equipment is allowed for PM Frequency and Labor Rate orders."),
			);
		}
	},
});

// ─── Status Indicator ─────────────────────────────────────────────────────────

const STATUS_COLORS = {
	New: "gray",
	Programmed: "blue",
	Repairing: "orange",
	"Partial Repair": "yellow",
	Staged: "purple",
	Completed: "green",
	Billed: "green",
	Issued: "green",
	Closed: "green",
	Cancelled: "red",
};

function set_status_indicator(frm) {
	const status = frm.doc.status || "New";
	frm.page.set_indicator(__(status), STATUS_COLORS[status] || "gray");
}

// ─── Form State ───────────────────────────────────────────────────────────────

const DETAIL_FIELDS = [
	"customer",
	"company",
	"equipment_selection",
	"service_type",
	"scheduled_date",
	"hour_meter",
	"po_number",
];

function set_form_state(frm) {
	const status = frm.doc.status;
	// Once Staged, the work order is locked — no further edits except via action buttons.
	if (["Staged", "Completed", "Billed", "Issued", "Closed"].includes(status)) {
		frm.disable_form();
	} else if (["Repairing", "Partial Repair"].includes(status)) {
		// Lock only order details — items/docs remain editable.
		DETAIL_FIELDS.forEach((f) => frm.set_df_property(f, "read_only", 1));
	}
}

// ─── Status Buttons ───────────────────────────────────────────────────────────

function set_status_buttons(frm) {
	const status = frm.doc.status;

	// New / Programmed → Repairing
	if (["New", "Programmed"].includes(status) && !frm.is_new()) {
		frm.add_custom_button(__("Start Repair"), () => start_repair(frm)).addClass("btn-primary");
	}

	// Repairing → Partial Repair or Staged
	if (status === "Repairing") {
		frm.add_custom_button(__("Partial Repair"), () => partial_repair(frm));
		frm.add_custom_button(__("Finish Repair"), () => finish_repair(frm)).addClass(
			"btn-success",
		);
	}

	// Partial Repair → Repairing (resume)
	if (status === "Partial Repair") {
		frm.add_custom_button(__("Resume Repair"), () => start_repair(frm)).addClass(
			"btn-primary",
		);
	}

	// Staged → signature link flow
	if (status === "Staged") {
		if (!frm.doc.signature_link) {
			frm.add_custom_button(__("Generate Signature Link"), () =>
				generate_signature_link(frm),
			).addClass("btn-primary");
		} else {
			frm.add_custom_button(__("Open Link"), () => {
				window.open(normalize_signature_link(frm.doc.signature_link), "_blank");
			}).addClass("btn-primary");
			frm.add_custom_button(__("Copy Link"), () => {
				frappe.utils.copy_to_clipboard(normalize_signature_link(frm.doc.signature_link));
				frappe.show_alert(
					{ message: __("Signature link copied to clipboard."), indicator: "green" },
					3,
				);
			});
			frm.add_custom_button(
				__("Regenerate link"),
				() => generate_signature_link(frm),
				__("Actions"),
			);
		}
	}
	// Skip Signature — if staged
	if (status === "Staged" && !frm.doc.signature_skipped) {
		frm.add_custom_button(__("Skip Signature"), () => skip_signature(frm)).addClass(
			"btn-danger",
		);
	}
	// Staged / Completed → Create Stock Entry (for exception items)
	if (["Staged", "Completed"].includes(status)) {
		frm.add_custom_button(
			__("Create Stock Entry"),
			() => create_stock_entry(frm),
			__("Actions"),
		);
	}

	// Completed → Create Invoice or View Invoice (if one already exists)
	if (status === "Completed") {
		frappe.db
			.get_value(
				"Sales Invoice",
				{
					custom_source_doctype: "Service Work Order",
					custom_source_document: frm.doc.name,
					docstatus: ["<", 2],
				},
				"name",
			)
			.then((r) => {
				const invoice_name = r.message && r.message.name;
				if (invoice_name) {
					frm.add_custom_button(__("View Invoice"), () => {
						frappe.set_route("Form", "Sales Invoice", invoice_name);
					}).addClass("btn-primary");
				} else {
					frm.add_custom_button(__("Create Invoice"), () =>
						create_invoice(frm),
					).addClass("btn-primary");
				}
			});
	}

	// Billed / Issued / Closed → View Invoice (always exists)
	if (["Billed", "Issued", "Closed"].includes(status)) {
		frappe.db
			.get_value(
				"Sales Invoice",
				{
					custom_source_doctype: "Service Work Order",
					custom_source_document: frm.doc.name,
					docstatus: ["<", 2],
				},
				"name",
			)
			.then((r) => {
				const invoice_name = r.message && r.message.name;
				if (invoice_name) {
					frm.add_custom_button(__("View Invoice"), () => {
						frappe.set_route("Form", "Sales Invoice", invoice_name);
					}).addClass("btn-primary");
				}
			});
	}

	// PO Number action — available once repair has started
	const po_states = [
		"Repairing",
		"Partial Repair",
		"Staged",
		"Completed",
		"Billed",
		"Issued",
		"Closed",
	];
	if (po_states.includes(status)) {
		frm.add_custom_button(__("Update PO Number"), () => update_po_number(frm), __("Actions"));
	}

	// Return to Signature — if signature was skipped
	if (frm.doc.signature_skipped) {
		frm.add_custom_button(
			__("Return to Signature"),
			() => return_to_signature(frm),
			__("Actions"),
		);
	}

	// Change Responsible — only available if order is not finalized
	const finalized_states = ["Completed", "Billed", "Issued", "Closed", "Cancelled"];
	if (!frm.is_new() && !finalized_states.includes(status)) {
		frm.add_custom_button(
			__("Change Responsible"),
			() => change_responsible_user(frm),
			__("Actions"),
		);
	}
}

// ─── Actions ─────────────────────────────────────────────────────────────────

function start_repair(frm) {
	frm.set_value("status", "Repairing");
	const row = frappe.model.add_child(frm.doc, "Service Work Order Time Log", "time_logs");
	frappe.model.set_value(row.doctype, row.name, "start_time", frappe.datetime.now_datetime());
	frappe.model.set_value(row.doctype, row.name, "type", "Repair Session");
	frm.refresh_field("time_logs");
	frm.save();
}

function partial_repair(frm) {
	const dialog = new frappe.ui.Dialog({
		title: __("Partial Repair"),
		fields: [
			{
				label: __("Reason / Description"),
				fieldname: "description",
				fieldtype: "Small Text",
				reqd: 1,
				description: __("Why is the repair being paused?"),
			},
		],
		primary_action_label: __("Pause Repair"),
		primary_action(values) {
			close_last_time_log(frm, values.description, "Partial Repair");
			frm.set_value("status", "Partial Repair");
			frm.save().then(() => dialog.hide());
		},
	});
	dialog.show();
}

function finish_repair(frm) {
	const needs_hours = ["Labor Rate", "Misc"].includes(frm.doc.service_type);
	const is_misc = frm.doc.service_type === "Misc";

	if (is_misc) {
		frappe.db
			.get_single_value("Service Manager Settings", "misc_default_days")
			.then((days) => {
				const default_next_date = frappe.datetime.add_days(
					frappe.datetime.nowdate(),
					days || 90,
				);
				_show_finish_repair_dialog(frm, needs_hours, is_misc, default_next_date);
			});
	} else {
		_show_finish_repair_dialog(frm, needs_hours, is_misc, null);
	}
}

function _show_finish_repair_dialog(frm, needs_hours, is_misc, default_next_date) {
	const fields = [];

	if (needs_hours) {
		fields.push({
			label: __("Hours Worked"),
			fieldname: "hours_worked",
			fieldtype: "Float",
			reqd: 1,
			description: __("Billable hours for service cost calculation"),
		});
	}

	if (is_misc) {
		fields.push({
			label: __("Next Scheduled Date"),
			fieldname: "next_scheduled_date",
			fieldtype: "Date",
			reqd: 1,
			default: default_next_date,
			description: __("Date for the next scheduled Misc work order (pre-filled from settings)"),
		});
	}

	fields.push({
		label: __("Final Notes"),
		fieldname: "description",
		fieldtype: "Small Text",
	});

	const dialog = new frappe.ui.Dialog({
		title: __("Finish Repair"),
		fields,
		primary_action_label: __("Move to Staged"),
		primary_action(values) {
			if (needs_hours) {
				frm.set_value("hours_worked", values.hours_worked);
			}
			if (is_misc) {
				frm.set_value("next_scheduled_date", values.next_scheduled_date);
			}
			close_last_time_log(frm, values.description, "Repair Session");
			frm.set_value("status", "Staged");
			frm.save().then(() => dialog.hide());
		},
	});
	dialog.show();
}

function close_last_time_log(frm, description, type) {
	const logs = frm.doc.time_logs || [];
	const open_log = [...logs].reverse().find((r) => r.start_time && !r.end_time);
	if (!open_log) return;

	const end_time = frappe.datetime.now_datetime();

	// Calculate duration: both strings from Frappe server, parse with moment to avoid timezone issues
	const duration_hours =
		Math.round(
			(moment(end_time, "YYYY-MM-DD HH:mm:ss").diff(
				moment(open_log.start_time, "YYYY-MM-DD HH:mm:ss"),
				"seconds",
			) /
				3600) *
				100,
		) / 100;

	frappe.model.set_value(open_log.doctype, open_log.name, "end_time", end_time);
	frappe.model.set_value(open_log.doctype, open_log.name, "duration_in_hours", duration_hours);
	if (description) {
		frappe.model.set_value(open_log.doctype, open_log.name, "description", description);
	}
	if (type) {
		frappe.model.set_value(open_log.doctype, open_log.name, "type", type);
	}

	const total = (frm.doc.time_logs || []).reduce(
		(sum, r) => sum + (r.name === open_log.name ? duration_hours : r.duration_in_hours || 0),
		0,
	);
	frm.set_value("total_repair_time", Math.round(total * 100) / 100);
	frm.refresh_field("time_logs");
}

// ─── Signature Link ───────────────────────────────────────────────────────────

function generate_signature_link(frm) {
	frappe.call({
		method: "southwest.service_management.doctype.service_work_order.service_work_order.generate_signature_link",
		args: { doc_name: frm.doc.name },
		freeze: true,
		freeze_message: __("Generating signature link..."),
		callback(r) {
			if (r.message) {
				frm.reload_doc().then(() => {
					window.open(r.message, "_blank");
				});
			}
		},
	});
}

// ─── Complete Work Order (kept for reference / fallback) ─────────────────────

function complete_work_order(frm) {
	const dialog = new frappe.ui.Dialog({
		title: __("Complete Work Order"),
		fields: [
			{
				label: __("Customer Signature"),
				fieldname: "customer_signature",
				fieldtype: "Signature",
				reqd: 1,
			},
		],
		primary_action_label: __("Complete"),
		primary_action(values) {
			if (!values.customer_signature) {
				frappe.msgprint(__("Customer Signature is required."));
				return;
			}
			dialog.hide();
			frappe.call({
				method: "southwest.service_management.doctype.service_work_order.service_work_order.complete_work_order",
				args: { doc_name: frm.doc.name, signature: values.customer_signature },
				freeze: true,
				freeze_message: __("Completing work order..."),
				callback(r) {
					if (r.message) {
						frm.reload_doc();
						if (["PM Frequency", "Misc"].includes(frm.doc.service_type)) {
							prompt_next_service(frm);
						}
					}
				},
			});
		},
	});
	dialog.show();
}

function prompt_next_service(frm) {
	const default_date =
		frm.doc.service_type === "PM Frequency"
			? frappe.datetime.add_days(frappe.datetime.nowdate(), 90)
			: "";

	frappe.prompt(
		[
			{
				label: __("Next Scheduled Date"),
				fieldname: "next_date",
				fieldtype: "Date",
				default: default_date,
				reqd: 1,
			},
		],
		function (values) {
			frappe.call({
				method: "southwest.service_management.doctype.service_work_order.service_work_order.create_programmed_order",
				args: { source_name: frm.doc.name, next_date: values.next_date },
				freeze: true,
				freeze_message: __("Creating programmed order..."),
				callback(r) {
					if (r.message) {
						frappe.show_alert(
							{
								message: __("Next service order created: {0}", [
									`<a href="/app/service-work-order/${r.message}">${r.message}</a>`,
								]),
								indicator: "green",
							},
							7,
						);
					}
				},
			});
		},
		__("Schedule Next Service"),
		__("Create"),
	);
}

// ─── Change Responsible User ──────────────────────────────────────────────────

function change_responsible_user(frm) {
	const current = frm.doc.responsible_user || "";
	const dialog = new frappe.ui.Dialog({
		title: __("Change Responsible"),
		fields: [
			{
				label: __("Current Responsible"),
				fieldname: "current_user",
				fieldtype: "Data",
				read_only: 1,
				default: current,
			},
			{
				label: __("New Responsible User"),
				fieldname: "new_user",
				fieldtype: "Link",
				options: "User",
				reqd: 1,
				get_query: function () {
					return { filters: { enabled: 1, user_type: "System User" } };
				},
			},
		],
		primary_action_label: __("Update"),
		primary_action(values) {
			if (!values.new_user) {
				frappe.msgprint(__("Please select a user."));
				return;
			}
			frappe.call({
				method: "southwest.service_management.doctype.service_work_order.service_work_order.change_responsible_user",
				args: {
					doc_name: frm.doc.name,
					new_user: values.new_user,
				},
				freeze: true,
				freeze_message: __("Updating responsible user…"),
				callback(r) {
					if (!r.exc) {
						frappe.show_alert(
							{
								message: __("Responsible user updated to {0}.", [values.new_user]),
								indicator: "green",
							},
							5,
						);
						dialog.hide();
						frm.reload_doc();
					}
				},
			});
		},
	});
	dialog.show();
}

// ─── Update PO Number ─────────────────────────────────────────────────────────

function update_po_number(frm) {
	frappe.prompt(
		{
			label: __("PO Number"),
			fieldname: "po_number",
			fieldtype: "Data",
			default: frm.doc.po_number || "",
		},
		function (values) {
			frappe.call({
				method: "southwest.service_management.doctype.service_work_order.service_work_order.update_po_number",
				args: { doc_name: frm.doc.name, po_number: values.po_number },
				callback() {
					frm.reload_doc();
				},
			});
		},
		__("Update PO Number"),
		__("Save"),
	);
}

// ─── Return to Signature ──────────────────────────────────────────────────────

function return_to_signature(frm) {
	frappe.confirm(
		__(
			"This will clear the skipped signature status and paper attachment, and move the status back to Staged. Continue?",
		),
		() => {
			frappe.call({
				method: "southwest.service_management.doctype.service_work_order.service_work_order.reset_signature",
				args: { doc_name: frm.doc.name },
				freeze: true,
				freeze_message: __("Resetting signature status..."),
				callback(r) {
					if (r.message) {
						frm.reload_doc();
					}
				},
			});
		},
	);
}

// ─── Skip Signature ───────────────────────────────────────────────────────────

function skip_signature(frm) {
	frappe.confirm(
		__("Are you sure you want to complete this work order without a customer signature?"),
		() => {
			frappe.call({
				method: "southwest.service_management.doctype.service_work_order.service_work_order.desk_skip_signature",
				args: {
					doc_name: frm.doc.name,
					paper_signature: "",
				},
				freeze: true,
				freeze_message: __("Skipping signature..."),
				callback(r) {
					if (r.message) {
						frm.reload_doc();
					}
				},
			});
		},
	);
}

// ─── Create Stock Entry ───────────────────────────────────────────────────────

function create_stock_entry(frm) {
	frappe.confirm(
		__(
			"This will create a draft Stock Entry (Material Issue) for items covered by the customer's service exceptions. Continue?",
		),
		() => {
			frappe.call({
				method: "southwest.service_management.doctype.service_work_order.service_work_order.create_stock_entry",
				args: { doc_name: frm.doc.name },
				freeze: true,
				freeze_message: __("Creating stock entry..."),
				callback(r) {
					if (r.message) {
						frappe.show_alert(
							{
								message: __("Stock Entry created: {0}", [
									`<a href="/app/stock-entry/${r.message}">${r.message}</a>`,
								]),
								indicator: "green",
							},
							7,
						);
					}
				},
			});
		},
	);
}

// ─── Create Invoice ───────────────────────────────────────────────────────────

function create_invoice(frm) {
	frappe.call({
		method: "southwest.service_management.doctype.service_work_order.service_work_order.resolve_and_create_invoice",
		args: { doc_name: frm.doc.name },
		freeze: true,
		freeze_message: __("Creating invoice..."),
		callback(r) {
			if (r.message) {
				frappe.set_route("Form", "Sales Invoice", r.message);
			}
		},
	});
}

// Ensure legacy signature links (generated before the /southwest prefix was added)
// still open correctly.
function normalize_signature_link(link) {
	if (!link) return link;
	return link.replace(/\/signature\?/, "/signature?");
}
