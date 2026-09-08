frappe.pages["service-manager-dashboard"].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Service Manager Dashboard"),
		single_column: true,
	});

	wrapper.page = page;
	wrapper.current_tab = "calendar"; // Default tab

	inject_smd_styles();
	page.body.append(build_smd_html(wrapper));

	page.add_inner_button(__("Refresh"), function () {
		refresh_smd(wrapper);
	});

	page.add_inner_button(__("New PO Assignment"), function () {
		show_new_po_dialog(wrapper);
	});

	page.add_inner_button(__("Backfill Part Assignments"), function () {
		frappe.confirm(
			__("Scan all completed work orders and create missing Part Assignment records?"),
			function () {
				frappe.call({
					method: "southwest.service_management.page.service_manager_dashboard.service_manager_dashboard.backfill_part_assignments",
					freeze: true,
					freeze_message: __("Scanning work orders…"),
					callback: function (r) {
						if (!r.exc) {
							var res = r.message || {};
							var n = res.created || 0;
							var f = res.fixed || 0;
							var parts = [];
							if (n > 0) parts.push(__("{0} assignment(s) created.", [n]));
							if (f > 0) parts.push(__("{0} line number(s) fixed.", [f]));
							frappe.show_alert({
								message: parts.length ? parts.join(" ") : __("No missing assignments found."),
								indicator: parts.length ? "green" : "blue",
							}, 5);
							refresh_smd(wrapper);
						}
					},
				});
			}
		);
	});

	// Tab switching events
	$(wrapper.page.body).on("click", ".nav-link", function () {
		var tab = $(this).data("tab");
		switch_tab(wrapper, tab);
	});

	refresh_smd(wrapper);
};

frappe.pages["service-manager-dashboard"].on_page_show = function (wrapper) {
	refresh_smd(wrapper);
};

// ---------------------------------------------------------------------------
// Tabs logic
// ---------------------------------------------------------------------------
function switch_tab(wrapper, tab_name) {
	wrapper.current_tab = tab_name;

	// Toggle active class on native buttons
	$(wrapper.page.body).find(".nav-link").removeClass("active");
	$(wrapper.page.body)
		.find('.nav-link[data-tab="' + tab_name + '"]')
		.addClass("active");

	// Toggle section visibility
	$(wrapper.page.body).find(".smd-tab-content").hide();
	if (tab_name === "assignments") {
		$(wrapper.page.body).find("#smd-assignments-section").show();
	} else {
		$(wrapper.page.body).find("#smd-billing-section").show();
	}
}

// ---------------------------------------------------------------------------
// Dialog: New PO Assignment
// ---------------------------------------------------------------------------
function show_new_po_dialog(wrapper) {
	var d = new frappe.ui.Dialog({
		title: __("New Customer PO Assignment"),
		fields: [
			{
				label: __("Customer"),
				fieldname: "customer",
				fieldtype: "Link",
				options: "Customer",
				reqd: 1,
			},
			{
				label: __("PO Number"),
				fieldname: "po_number",
				fieldtype: "Data",
				reqd: 1,
			},
			{
				label: __("Valid From"),
				fieldname: "valid_from",
				fieldtype: "Date",
				default: frappe.datetime.nowdate(),
				reqd: 1,
			},
			{
				label: __("Is Active"),
				fieldname: "is_active",
				fieldtype: "Check",
				default: 1,
			},
		],
		primary_action_label: __("Create Assignment"),
		primary_action: function (values) {
			frappe.call({
				method: "frappe.client.insert",
				args: {
					doc: {
						doctype: "Customer PO Assignment",
						...values,
					},
				},
				freeze: true,
				callback: function (r) {
					if (!r.exc) {
						frappe.show_alert({
							message: __("PO Assignment created successfully"),
							indicator: "green",
						});
						d.hide();
						refresh_smd(wrapper);
					}
				},
			});
		},
	});
	d.show();
}

// ---------------------------------------------------------------------------
// Data — single server call
// ---------------------------------------------------------------------------
function refresh_smd(wrapper) {
	render_smd_loading(wrapper);

	frappe.call({
		method: "southwest.service_management.page.service_manager_dashboard.service_manager_dashboard.get_dashboard_data",
		callback: function (r) {
			var data = r.message || {};
			render_smd_kpis(wrapper, data.kpis || {});
			render_smd_calendar(wrapper, data.calendar_events || []);
			render_smd_agenda_calendar(wrapper);
			render_smd_table(wrapper, data.pending_rows || []);
			render_invoice_table(wrapper, data.ready_to_invoice_rows || []);
			render_smd_signature_table(wrapper, data.waiting_signature_rows || []);

			// Fetch and render PO Summary
			frappe.call({
				method: "southwest.service_management.page.service_manager_dashboard.service_manager_dashboard.get_customer_po_summary",
				callback: function (r) {
					render_po_assignments_table(wrapper, r.message || []);
				},
			});

			// Ensure correct tab is shown after refresh
			switch_tab(wrapper, wrapper.current_tab);
		},
	});
}

// ---------------------------------------------------------------------------
// KPI cards
// ---------------------------------------------------------------------------
function render_smd_kpis(wrapper, kpis) {
	var $grid = $(wrapper.page.body).find("#smd-kpi-grid");
	if (!$grid.length) return;

	var pa = kpis.pending_assignments || 0;
	var ws = kpis.waiting_signature || 0;
	var ri = kpis.ready_to_invoice || 0;

	$grid.html(
		smd_stat_card(
			__("Pending Part Assignments"),
			pa,
			pa > 0 ? "smd-val-red" : "smd-val-muted",
		) +
			smd_stat_card(
				__("Waiting for Signature"),
				ws,
				ws > 0 ? "smd-val-orange" : "smd-val-muted",
			) +
			smd_stat_card(__("Ready to Invoice"), ri, ri > 0 ? "smd-val-green" : "smd-val-muted"),
	);
}

function smd_stat_card(label, value, value_cls) {
	return (
		'<div class="widget number-widget-box">' +
		'<div class="widget-head">' +
		'<div class="widget-label">' +
		'<div class="widget-title">' +
		'<span class="ellipsis" title="' +
		label +
		'">' +
		label +
		"</span>" +
		"</div>" +
		"</div>" +
		"</div>" +
		'<div class="widget-body">' +
		'<div class="widget-content">' +
		'<div class="number ' +
		(value_cls || "") +
		'">' +
		value +
		"</div>" +
		"</div>" +
		"</div>" +
		'<div class="widget-footer"></div>' +
		"</div>"
	);
}

// ---------------------------------------------------------------------------
// Assignments table
// ---------------------------------------------------------------------------
function render_smd_table(wrapper, rows) {
	var $c = $(wrapper.page.body).find("#smd-list-wrapper");
	if (!$c.length) return;

	if (!rows.length) {
		$c.html(
			'<div class="frappe-list">' +
				'<div class="no-result text-muted flex justify-center align-center" style="min-height:160px">' +
				'<div class="msg-box no-border">' +
				"<p>" +
				__("No pending part assignments — all items are assigned.") +
				"</p>" +
				"</div>" +
				"</div>" +
				"</div>",
		);
		return;
	}

	var header =
		'<div class="list-row-container">' +
		'<header class="level list-row-head text-muted">' +
		'<div class="level-left list-header-subject">' +
		smd_col(__("Assignment ID"), "list-subject level name", true) +
		smd_col(__("Work Order #"), "hidden-xs") +
		smd_col(__("Line #"), "hidden-xs smd-col-narrow") +
		smd_col(__("Part Number"), "hidden-xs") +
		smd_col(__("Description"), "hidden-xs") +
		smd_col(__("Qty"), "hidden-xs smd-col-right") +
		"</div>" +
		'<div class="level-right">' +
		'<span class="list-count">' +
		rows.length +
		" " +
		__("pending") +
		"</span>" +
		"</div>" +
		"</header>" +
		"</div>";

	var body = "";
	rows.forEach(function (row) {
		var pa_link = frappe.utils.get_form_link("Service Part Assignment", row.name);
		var swo_link = frappe.utils.get_form_link("Service Work Order", row.service_work_order);
		var wo_label = frappe.utils.escape_html(row.work_order_number || row.service_work_order || "—");
		var part_no = frappe.utils.escape_html(row.part_number || "—");
		var desc = frappe.utils.escape_html(row.description || "—");
		var qty = row.qty != null ? row.qty : "—";
		var line_no = row.line_no != null ? row.line_no : "—";

		body +=
			'<div class="list-row-container" tabindex="1">' +
			'<div class="level list-row">' +
			'<div class="level-left ellipsis">' +
			'<div class="list-row-col ellipsis list-subject level name">' +
			'<span class="level-item bold ellipsis">' +
			'<a class="ellipsis" href="' +
			pa_link +
			'">' +
			frappe.utils.escape_html(row.name) +
			"</a>" +
			"</span>" +
			"</div>" +
			'<div class="list-row-col ellipsis hidden-xs">' +
			'<a href="' +
			swo_link +
			'">' +
			wo_label +
			"</a>" +
			"</div>" +
			'<div class="list-row-col ellipsis hidden-xs smd-col-narrow text-muted">' +
			line_no +
			"</div>" +
			'<div class="list-row-col ellipsis hidden-xs text-muted">' +
			part_no +
			"</div>" +
			'<div class="list-row-col ellipsis hidden-xs">' +
			desc +
			"</div>" +
			'<div class="list-row-col ellipsis hidden-xs smd-col-right text-muted">' +
			qty +
			"</div>" +
			"</div>" +
			'<div class="level-right">' +
			'<div class="level-item list-row-activity">' +
			'<button class="btn btn-xs btn-primary smd-assign-btn" ' +
			'data-name="' +
			frappe.utils.escape_html(row.name) +
			'" ' +
			'data-swo="' +
			frappe.utils.escape_html(row.service_work_order || "") +
			'" ' +
			'data-wo-number="' +
			frappe.utils.escape_html(row.work_order_number || row.service_work_order || "") +
			'" ' +
			'data-line-no="' +
			(row.line_no != null ? row.line_no : "") +
			'" ' +
			'data-part="' +
			frappe.utils.escape_html(row.part_number || "") +
			'" ' +
			'data-desc="' +
			frappe.utils.escape_html(row.description || "") +
			'" ' +
			'data-qty="' +
			(row.qty != null ? row.qty : "") +
			'" ' +
			'data-date="' +
			frappe.utils.escape_html(row.scheduled_date || "") +
			'" ' +
			'title="' +
			__("Assign product to this part") +
			'">' +
			__("Assign Item") +
			"</button>" +
			"</div>" +
			"</div>" +
			"</div>" +
			"</div>";
	});

	$c.html(
		'<div class="frappe-list">' +
			'<div class="result no-assign-to">' +
			header +
			body +
			"</div>" +
			"</div>",
	);

	$c.off("click.smd").on("click.smd", ".smd-assign-btn", function () {
		// ... existing Assign Item logic ...
		var $btn = $(this);
		var row_name = $btn.data("name");
		var d = new frappe.ui.Dialog({
			title: __("Assign Item"),
			fields: [
				{
					fieldtype: "Date",
					fieldname: "scheduled_date",
					label: __("Scheduled Date"),
					read_only: 1,
					default: $btn.data("date"),
				},
				{
					fieldtype: "Data",
					fieldname: "swo_display",
					label: __("Work Order #"),
					read_only: 1,
					default: $btn.data("wo-number"),
				},
				{
					fieldtype: "Data",
					fieldname: "service_work_order",
					hidden: 1,
					default: $btn.data("swo"),
				},
				{
					fieldtype: "Int",
					fieldname: "line_no",
					label: __("Line #"),
					read_only: 1,
					default: $btn.data("line-no"),
				},
				{
					fieldtype: "Data",
					fieldname: "part_number",
					label: __("Part Number"),
					read_only: 1,
					default: $btn.data("part"),
				},
				{
					fieldtype: "Small Text",
					fieldname: "description",
					label: __("Description"),
					read_only: 1,
					default: $btn.data("desc"),
				},
				{
					fieldtype: "Float",
					fieldname: "qty",
					label: __("Qty"),
					read_only: 1,
					default: parseFloat($btn.data("qty")) || 0,
				},
				{
					fieldtype: "Link",
					fieldname: "item_code",
					label: __("Product (Item)"),
					options: "Item",
					reqd: 1,
					get_query: function () {
						return { filters: { is_stock_item: 1, disabled: 0 } };
					},
				},
			],
			primary_action_label: __("Save & Assign"),
			primary_action: function (values) {
				frappe.call({
					method: "frappe.client.set_value",
					args: {
						doctype: "Service Part Assignment",
						name: row_name,
						fieldname: { item_code: values.item_code, status: "Assigned" },
					},
					freeze: true,
					callback: function (r) {
						if (!r.exc) {
							frappe.show_alert({
								message: __("Assigned successfully"),
								indicator: "green",
							});
							d.hide();
							refresh_smd(wrapper);
						}
					},
				});
			},
		});
		d.show();
	});
}

// ---------------------------------------------------------------------------
// Billing table
// ---------------------------------------------------------------------------
function render_invoice_table(wrapper, rows) {
	var $c = $(wrapper.page.body).find("#smd-invoice-list-wrapper");
	if (!$c.length) return;

	if (!rows.length) {
		$c.html(
			'<div class="frappe-list" style="margin-bottom: 30px">' +
				'<div class="no-result text-muted flex justify-center align-center" style="min-height:160px">' +
				'<div class="msg-box no-border">' +
				"<p>" +
				__("No work orders are currently ready for invoicing.") +
				"</p>" +
				"</div>" +
				"</div>" +
				"</div>",
		);
		return;
	}

	var header =
		'<div class="list-row-container">' +
		'<header class="level list-row-head text-muted">' +
		'<div class="level-left list-header-subject">' +
		smd_col(__("Work Order ID"), "list-subject level name", true) +
		smd_col(__("Customer"), "hidden-xs") +
		smd_col(__("Scheduled Date"), "hidden-xs") +
		smd_col(__("Status"), "hidden-xs") +
		smd_col(__("PO Number"), "hidden-xs smd-col-right") +
		"</div>" +
		'<div class="level-right">' +
		'<span class="list-count">' +
		rows.length +
		" " +
		__("orders") +
		"</span>" +
		"</div>" +
		"</header>" +
		"</div>";

	var body = "";
	rows.forEach(function (row) {
		var swo_link = frappe.utils.get_form_link("Service Work Order", row.name);
		var cust = frappe.utils.escape_html(row.customer_name || row.customer || "—");
		var date = row.scheduled_date ? frappe.datetime.str_to_user(row.scheduled_date) : "—";
		var po = frappe.utils.escape_html(row.po_number || "—");
		var status = frappe.utils.escape_html(__(row.status || "—"));
		var display_name = row.work_order_number
			? row.name + " (" + row.work_order_number + ")"
			: row.name;

		// Build action cell: view buttons if docs already exist, play button if not
		var action_html = "";
		if (row.sales_invoice || row.stock_entry) {
			if (row.sales_invoice) {
				action_html +=
					'<button class="btn btn-xs btn-default smd-view-inv-btn" ' +
					'data-name="' +
					frappe.utils.escape_html(row.sales_invoice) +
					'" ' +
					'title="' +
					__("View Invoice") +
					'" style="margin-right:4px">' +
					__("View Invoice") +
					"</button>";
			}
			if (row.stock_entry) {
				action_html +=
					'<button class="btn btn-xs btn-default smd-view-se-btn" ' +
					'data-name="' +
					frappe.utils.escape_html(row.stock_entry) +
					'" ' +
					'title="' +
					__("View Stock Entry") +
					'">' +
					__("View Stock Entry") +
					"</button>";
			}
		} else {
			action_html =
				'<button class="btn btn-xs btn-primary smd-process-btn" ' +
				'data-name="' +
				frappe.utils.escape_html(row.name) +
				'" ' +
				'title="' +
				__("Process Billing & Stock") +
				'">' +
				'<i class="fa fa-play fa-fw"></i>' +
				"</button>";
		}

		body +=
			'<div class="list-row-container" tabindex="1">' +
			'<div class="level list-row">' +
			'<div class="level-left ellipsis">' +
			'<div class="list-row-col ellipsis list-subject level name">' +
			'<span class="level-item bold ellipsis">' +
			'<a class="ellipsis" href="' +
			swo_link +
			'">' +
			frappe.utils.escape_html(display_name) +
			"</a>" +
			"</span>" +
			"</div>" +
			'<div class="list-row-col ellipsis hidden-xs text-muted">' +
			cust +
			"</div>" +
			'<div class="list-row-col ellipsis hidden-xs">' +
			date +
			"</div>" +
			'<div class="list-row-col ellipsis hidden-xs">' +
			status +
			"</div>" +
			'<div class="list-row-col ellipsis hidden-xs smd-col-right text-muted">' +
			po +
			"</div>" +
			"</div>" +
			'<div class="level-right">' +
			'<div class="level-item list-row-activity">' +
			action_html +
			"</div>" +
			"</div>" +
			"</div>" +
			"</div>";
	});

	$c.html(
		'<div class="frappe-list" style="margin-bottom: 30px">' +
			'<div class="result no-assign-to">' +
			header +
			body +
			"</div>" +
			"</div>",
	);

	// Process button — create invoice/stock entry
	$c.off("click.smd_inv").on("click.smd_inv", ".smd-process-btn", function () {
		var $btn = $(this);
		var row_name = $btn.data("name");
		frappe.confirm(__("Process Billing and Stock for {0}?", [row_name]), function () {
			frappe.call({
				method: "southwest.api.process_billing_and_stock",
				args: { swo_name: row_name },
				freeze: true,
				freeze_message: __("Processing..."),
				callback: function (r) {
					if (!r.exc) {
						var msg = __("Processed successfully.");
						var res = r.message || {};
						if (res.sales_invoice)
							msg +=
								" " +
								__("Invoice: <a href='/app/sales-invoice/{0}'>{0}</a>", [
									res.sales_invoice,
								]);
						if (res.stock_entry)
							msg +=
								" " +
								__("Stock Entry: <a href='/app/stock-entry/{0}'>{0}</a>", [
									res.stock_entry,
								]);
						frappe.show_alert({ message: msg, indicator: "green" }, 7);
						refresh_smd(wrapper);
					}
				},
			});
		});
	});

	// View Invoice button — navigate to linked Sales Invoice
	$c.off("click.smd_view_inv").on("click.smd_view_inv", ".smd-view-inv-btn", function () {
		frappe.set_route("Form", "Sales Invoice", $(this).data("name"));
	});

	// View Stock Entry button — navigate to linked Stock Entry
	$c.off("click.smd_view_se").on("click.smd_view_se", ".smd-view-se-btn", function () {
		frappe.set_route("Form", "Stock Entry", $(this).data("name"));
	});
}

function smd_col(label, extra_cls, is_subject) {
	var base = "list-row-col ellipsis" + (is_subject ? " list-subject level name" : "");
	return '<div class="' + base + " " + (extra_cls || "") + '"><span>' + label + "</span></div>";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function render_smd_loading(wrapper) {
	$(wrapper.page.body)
		.find("#smd-list-wrapper")
		.html(
			'<div class="frappe-list">' +
				'<div class="smd-empty-state text-muted">' +
				__("Loading…") +
				"</div>" +
				"</div>",
		);
	$(wrapper.page.body)
		.find("#smd-invoice-list-wrapper")
		.html(
			'<div class="frappe-list" style="margin-bottom: 30px">' +
				'<div class="smd-empty-state text-muted">' +
				__("Loading…") +
				"</div>" +
				"</div>",
		);
	$(wrapper.page.body)
		.find("#smd-signature-list-wrapper")
		.html(
			'<div class="frappe-list" style="margin-bottom: 30px">' +
				'<div class="smd-empty-state text-muted">' +
				__("Loading…") +
				"</div>" +
				"</div>",
		);
	$(wrapper.page.body)
		.find("#smd-kpi-grid")
		.html('<div class="smd-empty-state text-muted">' + __("Loading…") + "</div>");
	// We don't clear the calendar container to avoid flicker during background refreshes
}

function switch_tab(wrapper, tab_name) {
	wrapper.current_tab = tab_name;

	// Toggle active class on native buttons
	$(wrapper.page.body).find(".nav-link").removeClass("active");
	$(wrapper.page.body)
		.find('.nav-link[data-tab="' + tab_name + '"]')
		.addClass("active");

	// Toggle section visibility
	$(wrapper.page.body).find(".smd-tab-content").hide();
	if (tab_name === "calendar") {
		$(wrapper.page.body).find("#smd-calendar-section").show();
		if (wrapper.calendar) {
			wrapper.calendar.render();
		}
	} else if (tab_name === "agenda") {
		$(wrapper.page.body).find("#smd-agenda-section").show();
		if (wrapper.agenda_calendar) {
			wrapper.agenda_calendar.render();
		}
	} else if (tab_name === "assignments") {
		$(wrapper.page.body).find("#smd-assignments-section").show();
	} else if (tab_name === "billing") {
		$(wrapper.page.body).find("#smd-billing-section").show();
	} else if (tab_name === "signatures") {
		$(wrapper.page.body).find("#smd-signatures-section").show();
	} else if (tab_name === "po_assignments") {
		$(wrapper.page.body).find("#smd-po-assignments-section").show();
	}
}

function build_smd_html(wrapper) {
	return $(
		[
			'<div class="smd-wrapper">',
			'<div id="smd-kpi-grid" class="smd-kpi-grid"></div>',

			'<div class="form-tabs-list" style="margin-bottom: 20px; border-bottom: 1px solid var(--border-color);">',
			'<ul class="nav form-tabs" role="tablist">',
			'<li class="nav-item show">',
			'<button class="nav-link active" data-tab="calendar" type="button" role="tab">' +
				__("Calendar") +
				"</button>",
			"</li>",
			'<li class="nav-item show">',
			'<button class="nav-link" data-tab="agenda" type="button" role="tab">' +
				__("Agenda") +
				"</button>",
			"</li>",
			'<li class="nav-item show">',
			'<button class="nav-link" data-tab="assignments" type="button" role="tab">' +
				__("Part Assignments") +
				"</button>",
			"</li>",
			'<li class="nav-item show">',
			'<button class="nav-link" data-tab="billing" type="button" role="tab">' +
				__("Billing & Processing") +
				"</button>",
			"</li>",
			'<li class="nav-item show">',
			'<button class="nav-link" data-tab="signatures" type="button" role="tab">' +
				__("Pending Signatures") +
				"</button>",
			"</li>",
			'<li class="nav-item show">',
			'<button class="nav-link" data-tab="po_assignments" type="button" role="tab">' +
				__("PO Assignments") +
				"</button>",
			"</li>",
			"</ul>",
			"</div>",

			'<div id="smd-calendar-section" class="smd-tab-content">',
			get_smd_calendar_legend(),
			'<div id="smd-calendar-wrapper"></div>',
			"</div>",

			'<div id="smd-agenda-section" class="smd-tab-content" style="display:none;">',
			get_smd_agenda_legend(),
			'<div id="smd-agenda-calendar-wrapper"></div>',
			"</div>",

			'<div id="smd-assignments-section" class="smd-tab-content" style="display:none;">',
			'<div class="smd-section-title">' + __("Pending Part Assignments") + "</div>",
			'<div id="smd-list-wrapper"></div>',
			"</div>",

			'<div id="smd-billing-section" class="smd-tab-content" style="display:none;">',
			'<div class="smd-section-title">' + __("Ready to Invoice & Process") + "</div>",
			'<div id="smd-invoice-list-wrapper"></div>',
			"</div>",

			'<div id="smd-signatures-section" class="smd-tab-content" style="display:none;">',
			'<div class="smd-section-title">' + __("Pending Customer Signatures") + "</div>",
			'<div id="smd-signature-list-wrapper"></div>',
			"</div>",

			'<div id="smd-po-assignments-section" class="smd-tab-content" style="display:none;">',
			'<div class="smd-section-title">' + __("Customer PO Assignments") + "</div>",
			'<div id="smd-po-assignments-list-wrapper"></div>',
			"</div>",

			"</div>",
		].join(""),
	);
}

function inject_smd_styles() {
	if (document.getElementById("smd-styles")) return;
	var el = document.createElement("style");
	el.id = "smd-styles";
	el.textContent = [
		".smd-wrapper{padding:var(--padding-lg,24px)}",
		".smd-kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:28px}",
		"@media(max-width:768px){.smd-kpi-grid{grid-template-columns:1fr 1fr}}",
		"@media(max-width:480px){.smd-kpi-grid{grid-template-columns:1fr}}",
		".smd-val-red{color:var(--red,#e74c3c)}",
		".smd-val-orange{color:var(--orange,#e67e22)}",
		".smd-val-green{color:var(--green,#27ae60)}",
		".smd-val-muted{color:var(--text-muted,#8d99a6)}",
		".smd-section-title{font-size:var(--text-md,13px);font-weight:600;margin-top:10px;margin-bottom:10px;color:var(--heading-color,#1f272e);text-transform:uppercase;letter-spacing:.04em}",
		".smd-col-right{text-align:right}",
		".smd-col-narrow{max-width:60px;text-align:center}",
		".smd-empty-state{padding:40px;text-align:center;font-size:13px}",

		/* Native Tab Tweak - ensures correct cursor and spacing on custom page */
		".form-tabs .nav-link{cursor:pointer !important; font-weight: 500; font-size: 13px; color: var(--text-muted); border: none; background: transparent; padding: 10px 15px; margin-right: 5px;}",
		".form-tabs .nav-link.active{color: var(--text-color); border-bottom: 2px solid var(--primary-color) !important; font-weight: 600;}",
		".form-tabs .nav-link:hover:not(.active){color: var(--text-color); border-bottom: 2px solid var(--border-color);}",

		/* Calendar Legend */
		".smd-calendar-legend{display:flex; flex-wrap:wrap; gap:15px; margin-bottom:15px; padding:10px; background:var(--bg-light-gray); border-radius:var(--border-radius-sm); border: 1px solid var(--border-color);}",
		".legend-item{display:flex; align-items:center; font-size:12px; color:var(--text-muted); font-weight:500;}",
		".legend-dot{width:12px; height:12px; border-radius:50%; margin-right:6px; display:inline-block}",

		/* FullCalendar Scroll Fix */
		"#smd-calendar-section { height: calc(100vh - 270px); min-height: 500px; overflow: hidden; display: flex; flex-direction: column; background: var(--bg-color); }",
		"#smd-calendar-wrapper { flex: 1; overflow: hidden; display: flex; flex-direction: column; padding: 20px; }",
		"#smd-calendar-wrapper .fc { flex: 1; overflow: hidden; }",
		"#smd-calendar-wrapper .fc-view-harness { background: var(--bg-color); }",
		"#smd-agenda-section { height: calc(100vh - 270px); min-height: 500px; overflow: hidden; display: flex; flex-direction: column; background: var(--bg-color); }",
		"#smd-agenda-calendar-wrapper { flex: 1; overflow: hidden; display: flex; flex-direction: column; padding: 20px; }",
		"#smd-agenda-calendar-wrapper .fc { flex: 1; overflow: hidden; }",
		"#smd-agenda-calendar-wrapper .fc-view-harness { background: var(--bg-color); }",
		".fc-scroller-harness { background: var(--bg-color); }",

		/* Event Popover */
		".smd-event-popover{position:fixed;z-index:9999;width:320px;background:var(--bg-color,#fff);border:1px solid var(--border-color,#e2e6ea);border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.14);overflow:hidden;}",
		".smd-ep-loading{display:flex;align-items:center;justify-content:center;height:120px;}",
		".smd-ep-spinner{width:28px;height:28px;border:3px solid var(--border-color);border-top-color:var(--primary-color);border-radius:50%;animation:smd-spin .7s linear infinite;}",
		"@keyframes smd-spin{to{transform:rotate(360deg)}}",
		".smd-ep-header{display:flex;align-items:flex-start;justify-content:space-between;padding:14px 16px 10px;border-bottom:1px solid var(--border-color);}",
		".smd-ep-title{font-size:14px;font-weight:700;color:var(--heading-color);margin-bottom:5px;}",
		".smd-ep-badge{display:inline-block;font-size:11px;font-weight:600;color:#fff;padding:2px 10px;border-radius:999px;}",
		".smd-ep-close{background:none;border:none;font-size:20px;line-height:1;color:var(--text-muted);cursor:pointer;padding:0 4px;margin-left:8px;flex-shrink:0;}",
		".smd-ep-close:hover{color:var(--red);}",
		".smd-ep-body{padding:12px 16px;display:grid;grid-template-columns:1fr 1fr;gap:8px 12px;}",
		".smd-ep-row{display:flex;flex-direction:column;gap:2px;}",
		".smd-ep-label{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--text-muted);}",
		".smd-ep-value{font-size:12px;color:var(--text-color);word-break:break-word;}",
		".smd-ep-equip-section{padding:8px 16px 10px;border-top:1px solid var(--border-color);}",
		".smd-ep-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px;max-height:108px;overflow-y:auto;padding:2px 1px 4px;}",
		".smd-ep-tag{display:inline-block;font-size:11px;font-weight:500;padding:3px 9px;border-radius:999px;background:var(--blue-100,#dbeafe);color:var(--blue-800,#1e3a8a);border:1px solid var(--blue-200,#bfdbfe);}",
		".smd-ep-description{margin-top:5px;max-height:90px;overflow-y:auto;white-space:pre-wrap;font-size:12px;line-height:1.45;color:var(--text-color);}",
		".smd-ep-footer{padding:10px 16px 14px;border-top:1px solid var(--border-color);}",
		".smd-ep-goto{width:100%;font-size:13px !important;}",
	].join("\n");
	document.head.appendChild(el);
}

function get_smd_calendar_legend() {
	var items = [
		{ color: "var(--cyan-500)", label: __("New") },
		{ color: "var(--blue-500)", label: __("Programmed") },
		{ color: "var(--orange-500)", label: __("Repairing") },
		{ color: "var(--yellow-600)", label: __("Partial Repair") },
		{ color: "var(--purple-500)", label: __("Staged (Signature)") },
		{ color: "var(--green-500)", label: __("Completed") },
		{ color: "var(--cyan-600)", label: __("Billed") },
		{ color: "var(--blue-600)", label: __("Issued") },
		{ color: "var(--gray-700)", label: __("Closed") },
		{ color: "var(--red-500)", label: __("Cancelled") },
	];

	var html = '<div class="smd-calendar-legend">';
	items.forEach(function (item) {
		html +=
			'<div class="legend-item">' +
			'<span class="legend-dot" style="background-color:' +
			item.color +
			'"></span>' +
			"<span>" +
			item.label +
			"</span>" +
			"</div>";
	});
	html += "</div>";
	return html;
}

function get_smd_agenda_legend() {
	var items = [
		{ color: "var(--blue-500)", label: __("Event") },
		{ color: "var(--orange-500)", label: __("Task") },
		{ color: "var(--purple-500)", label: __("Reminder") },
		{ color: "var(--green-500)", label: __("Completed") },
		{ color: "var(--gray-500)", label: __("Cancelled") },
	];

	var html = '<div class="smd-calendar-legend">';
	items.forEach(function (item) {
		html +=
			'<div class="legend-item">' +
			'<span class="legend-dot" style="background-color:' +
			item.color +
			'"></span>' +
			"<span>" +
			item.label +
			"</span>" +
			"</div>";
	});
	html += "</div>";
	return html;
}

// ---------------------------------------------------------------------------
// Calendar logic
// ---------------------------------------------------------------------------
function render_smd_calendar(wrapper, events) {
	var $container = $(wrapper.page.body).find("#smd-calendar-wrapper");
	if (!$container.length) return;

	frappe.require(["calendar.bundle.js"], function () {
		if (wrapper.calendar) {
			wrapper.calendar.removeAllEvents();
			wrapper.calendar.addEventSource(format_calendar_events(events));
			return;
		}

		var calendarEl = $container[0];
		wrapper.calendar = new frappe.FullCalendar(calendarEl, {
			plugins: frappe.FullCalendar.Plugins,
			initialView: "dayGridMonth",
			headerToolbar: {
				left: "prev,next today",
				center: "title",
				right: "dayGridMonth,timeGridWeek,timeGridDay",
			},
			events: format_calendar_events(events),
			eventClick: function (info) {
				show_event_popover(info.event.id, info.jsEvent);
			},
			height: "100%",
			stickyHeaderDates: true,
			locale: frappe.boot.lang || "en",
		});

		wrapper.calendar.render();
	});
}

function format_calendar_events(events) {
	return events.map(function (ev) {
		return {
			id: ev.id,
			title: ev.title,
			start: ev.start,
			backgroundColor: get_status_color(ev.status),
			borderColor: get_status_color(ev.status),
			textColor: "#ffffff",
		};
	});
}

function get_status_color(status) {
	var map = {
		New: "var(--cyan-500)",
		Programmed: "var(--blue-500)",
		Repairing: "var(--orange-500)",
		"Partial Repair": "var(--yellow-600)",
		Staged: "var(--purple-500)",
		Completed: "var(--green-500)",
		Billed: "var(--cyan-600)",
		Issued: "var(--blue-600)",
		Closed: "var(--gray-700)",
		Cancelled: "var(--red-500)",
	};
	return map[status] || "var(--gray-500)";
}

// ---------------------------------------------------------------------------
// Shared agenda calendar
// ---------------------------------------------------------------------------
function render_smd_agenda_calendar(wrapper) {
	var $container = $(wrapper.page.body).find("#smd-agenda-calendar-wrapper");
	if (!$container.length) return;

	frappe.require(["calendar.bundle.js"], function () {
		if (wrapper.agenda_calendar) {
			wrapper.agenda_calendar.refetchEvents();
			return;
		}

		wrapper.agenda_calendar = new frappe.FullCalendar($container[0], {
			plugins: frappe.FullCalendar.Plugins,
			initialView: "dayGridMonth",
			headerToolbar: {
				left: "prev,next today",
				center: "title",
				right: "dayGridMonth,timeGridWeek,timeGridDay",
			},
			events: function (fetchInfo, successCallback, failureCallback) {
				frappe.call({
					method: "southwest.service_management.doctype.agenda_entry.agenda_entry.get_agenda_entries",
					args: {
						start: fetchInfo.startStr,
						end: fetchInfo.endStr,
					},
					callback: function (r) {
						successCallback(format_agenda_events(r.message || []));
					},
					error: failureCallback,
				});
			},
			eventClick: function (info) {
				show_agenda_event_popover(info.event.id, info.jsEvent);
			},
			dateClick: function (info) {
				var startsOn = info.allDay ? info.dateStr + " 09:00:00" : info.dateStr;
				frappe.new_doc("Agenda Entry", { starts_on: startsOn });
			},
			height: "100%",
			stickyHeaderDates: true,
			locale: frappe.boot.lang || "en",
		});

		wrapper.agenda_calendar.render();
	});
}

function format_agenda_events(entries) {
	return entries.map(function (entry) {
		var color = get_agenda_color(entry.entry_type, entry.status);
		return {
			id: entry.name,
			title: entry.subject,
			start: entry.starts_on,
			end: entry.ends_on || null,
			allDay: Boolean(entry.all_day),
			backgroundColor: color,
			borderColor: color,
			textColor: "#ffffff",
		};
	});
}

function get_agenda_color(entryType, status) {
	if (status === "Completed") return "var(--green-500)";
	if (status === "Cancelled") return "var(--gray-500)";
	var map = {
		Event: "var(--blue-500)",
		Task: "var(--orange-500)",
		Reminder: "var(--purple-500)",
	};
	return map[entryType] || "var(--gray-500)";
}

// ---------------------------------------------------------------------------
// Calendar event popover
// ---------------------------------------------------------------------------
function show_event_popover(swo_name, jsEvent) {
	$(".smd-event-popover").remove();

	var color = get_status_color("loading");
	var $pop = $([
		'<div class="smd-event-popover">',
		'  <div class="smd-ep-loading">',
		'    <div class="smd-ep-spinner"></div>',
		'  </div>',
		"</div>",
	].join(""));

	$("body").append($pop);
	_position_popover($pop, jsEvent);

	frappe.call({
		method: "southwest.service_management.page.service_manager_dashboard.service_manager_dashboard.get_swo_calendar_detail",
		args: { swo_name: swo_name },
		callback: function (r) {
			var d = r.message || {};
			var statusColor = get_status_color(d.status || "");
			var rows = [
				[__("Company"),        d.company         || "—"],
				[__("Service Type"),   d.service_type    || "—"],
				[__("Service Cost"),   d.service_cost != null ? format_currency(d.service_cost) : "—"],
				[__("Scheduled Date"), d.scheduled_date  ? frappe.datetime.str_to_user(d.scheduled_date) : "—"],
				[__("Hour Meter"),     d.hour_meter      || "—"],
				[__("PO Number"),      d.po_number       || "—"],
				[__("Responsible"),    d.responsible_user || "—"],
				[__("Prev. WO"),       d.previous_work_order || "—"],
			];

			var rowsHtml = rows.map(function (r) {
				return (
					'<div class="smd-ep-row">' +
					'<span class="smd-ep-label">' + r[0] + "</span>" +
					'<span class="smd-ep-value">' + frappe.utils.escape_html(String(r[1])) + "</span>" +
					"</div>"
				);
			}).join("");

			var equipment = Array.isArray(d.equipment) ? d.equipment : [];
			var equipHtml = equipment.length
				? equipment.map(function (e) {
					return '<span class="smd-ep-tag">' + frappe.utils.escape_html(e) + "</span>";
				}).join("")
				: '<span class="smd-ep-value">—</span>';

			var equipSection = [
				'<div class="smd-ep-equip-section">',
				'<span class="smd-ep-label">' + __("Equipment") + "</span>",
				'<div class="smd-ep-tags">' + equipHtml + "</div>",
				"</div>",
			].join("");

			$pop.html([
				'<div class="smd-ep-header">',
				'<div>',
				'<div class="smd-ep-title">' + frappe.utils.escape_html(d.work_order_number || swo_name) + (d.customer ? " &mdash; " + frappe.utils.escape_html(d.customer) : "") + "</div>",
				'<span class="smd-ep-badge" style="background:' + statusColor + '">' + frappe.utils.escape_html(__(d.status || "")) + "</span>",
				"</div>",
				'<button class="smd-ep-close" onclick="$(\'.smd-event-popover\').remove()">×</button>',
				"</div>",
				'<div class="smd-ep-body">',
				rowsHtml,
				"</div>",
				equipSection,
				'<div class="smd-ep-footer">',
				'<button class="btn btn-primary btn-sm smd-ep-goto" data-name="' + frappe.utils.escape_html(swo_name) + '">' +
				__("Go to Record") + " →" +
				"</button>",
				"</div>",
			].join(""));

			$pop.find(".smd-ep-goto").on("click", function () {
				frappe.set_route("Form", "Service Work Order", $(this).data("name"));
				$(".smd-event-popover").remove();
			});

			_position_popover($pop, jsEvent);
		},
	});

	$(document).off("mousedown.smd_popover").on("mousedown.smd_popover", function (e) {
		if (!$(e.target).closest(".smd-event-popover").length) {
			$(".smd-event-popover").remove();
			$(document).off("mousedown.smd_popover");
		}
	});
}

function show_agenda_event_popover(entry_name, jsEvent) {
	$(".smd-event-popover").remove();

	var $pop = $([
		'<div class="smd-event-popover">',
		'  <div class="smd-ep-loading">',
		'    <div class="smd-ep-spinner"></div>',
		'  </div>',
		"</div>",
	].join(""));

	$("body").append($pop);
	_position_popover($pop, jsEvent);

	frappe.call({
		method: "southwest.service_management.doctype.agenda_entry.agenda_entry.get_agenda_entry",
		args: { name: entry_name },
		callback: function (r) {
			var d = r.message || {};
			var statusColor = get_agenda_color(d.entry_type, d.status);
			var rows = [
				[__("Entry Type"), d.entry_type ? __(d.entry_type) : "—"],
				[__("Priority"), d.priority ? __(d.priority) : "—"],
				[__("Starts On"), format_agenda_datetime(d.starts_on, d.all_day)],
				[__("Ends On"), format_agenda_datetime(d.ends_on, d.all_day)],
				[__("Customer"), d.customer || "—"],
				[__("Created By"), d.owner || "—"],
			];

			var rowsHtml = rows.map(function (row) {
				return (
					'<div class="smd-ep-row">' +
					'<span class="smd-ep-label">' + frappe.utils.escape_html(String(row[0])) + "</span>" +
					'<span class="smd-ep-value">' + frappe.utils.escape_html(String(row[1])) + "</span>" +
					"</div>"
				);
			}).join("");

			var subscribers = Array.isArray(d.subscribers) ? d.subscribers : [];
			var subscribersHtml = subscribers.length
				? subscribers.map(function (subscriber) {
					return '<span class="smd-ep-tag">' + frappe.utils.escape_html(subscriber.user || "") + "</span>";
				}).join("")
				: '<span class="smd-ep-value">—</span>';

			var descriptionSection = d.description
				? [
					'<div class="smd-ep-equip-section">',
					'<span class="smd-ep-label">' + __("Description") + "</span>",
					'<div class="smd-ep-description">' + frappe.utils.escape_html(d.description) + "</div>",
					"</div>",
				].join("")
				: "";

			$pop.html([
				'<div class="smd-ep-header">',
				'<div>',
				'<div class="smd-ep-title">' + frappe.utils.escape_html(d.subject || entry_name) + "</div>",
				'<span class="smd-ep-badge" style="background:' + statusColor + '">' + frappe.utils.escape_html(__(d.status || "")) + "</span>",
				"</div>",
				'<button class="smd-ep-close" onclick="$(\'.smd-event-popover\').remove()">×</button>',
				"</div>",
				'<div class="smd-ep-body">',
				rowsHtml,
				"</div>",
				descriptionSection,
				'<div class="smd-ep-equip-section">',
				'<span class="smd-ep-label">' + __("Subscribers") + "</span>",
				'<div class="smd-ep-tags">' + subscribersHtml + "</div>",
				"</div>",
				'<div class="smd-ep-footer">',
				'<button class="btn btn-primary btn-sm smd-ep-goto" data-name="' + frappe.utils.escape_html(entry_name) + '">' +
				__("Go to Record") + " →" +
				"</button>",
				"</div>",
			].join(""));

			$pop.find(".smd-ep-goto").on("click", function () {
				frappe.set_route("Form", "Agenda Entry", $(this).data("name"));
				$(".smd-event-popover").remove();
			});

			_position_popover($pop, jsEvent);
		},
	});

	$(document).off("mousedown.smd_popover").on("mousedown.smd_popover", function (e) {
		if (!$(e.target).closest(".smd-event-popover").length) {
			$(".smd-event-popover").remove();
			$(document).off("mousedown.smd_popover");
		}
	});
}

function format_agenda_datetime(value, all_day) {
	if (!value) return "—";
	if (all_day) return frappe.datetime.str_to_user(String(value).slice(0, 10));
	return frappe.datetime.str_to_user(value);
}

function format_currency(value) {
	var symbol = frappe.boot.sysdefaults.currency_symbol || "$";
	return symbol + " " + parseFloat(value || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function _position_popover($pop, jsEvent) {
	var pw = 320, ph = 420;
	var x = jsEvent.clientX + 12;
	var y = jsEvent.clientY + 12;
	if (x + pw > window.innerWidth - 16) x = jsEvent.clientX - pw - 12;
	if (y + ph > window.innerHeight - 16) y = Math.max(16, window.innerHeight - ph - 16);
	$pop.css({ left: x, top: y });
}

// ---------------------------------------------------------------------------
// Signatures table
// ---------------------------------------------------------------------------
function render_smd_signature_table(wrapper, rows) {
	var $c = $(wrapper.page.body).find("#smd-signature-list-wrapper");
	if (!$c.length) return;

	if (!rows.length) {
		$c.html(
			'<div class="frappe-list" style="margin-bottom: 30px">' +
				'<div class="no-result text-muted flex justify-center align-center" style="min-height:160px">' +
				'<div class="msg-box no-border">' +
				"<p>" +
				__("No work orders are currently awaiting signatures.") +
				"</p>" +
				"</div>" +
				"</div>" +
				"</div>",
		);
		return;
	}

	var header =
		'<div class="list-row-container">' +
		'<header class="level list-row-head text-muted">' +
		'<div class="level-left list-header-subject">' +
		smd_col(__("Work Order ID"), "list-subject level name", true) +
		smd_col(__("Customer"), "hidden-xs") +
		smd_col(__("Scheduled Date"), "hidden-xs") +
		smd_col(__("Link Status"), "hidden-xs smd-col-right") +
		"</div>" +
		'<div class="level-right">' +
		'<span class="list-count">' +
		rows.length +
		" " +
		__("waiting") +
		"</span>" +
		"</div>" +
		"</header>" +
		"</div>";

	var body = "";
	rows.forEach(function (row) {
		var swo_link = frappe.utils.get_form_link("Service Work Order", row.name);
		var cust = frappe.utils.escape_html(row.customer_name || row.customer || "—");
		var date = row.scheduled_date ? frappe.datetime.str_to_user(row.scheduled_date) : "—";
		var link_status = row.signature_link ? __("Generated") : __("Missing");
		var display_name = row.work_order_number
			? row.name + " (" + row.work_order_number + ")"
			: row.name;

		body +=
			'<div class="list-row-container" tabindex="1">' +
			'<div class="level list-row">' +
			'<div class="level-left ellipsis">' +
			'<div class="list-row-col ellipsis list-subject level name">' +
			'<span class="level-item bold ellipsis">' +
			'<a class="ellipsis" href="' +
			swo_link +
			'">' +
			frappe.utils.escape_html(display_name) +
			"</a>" +
			"</span>" +
			"</div>" +
			'<div class="list-row-col ellipsis hidden-xs text-muted">' +
			cust +
			"</div>" +
			'<div class="list-row-col ellipsis hidden-xs">' +
			date +
			"</div>" +
			'<div class="list-row-col ellipsis hidden-xs smd-col-right text-muted">' +
			link_status +
			"</div>" +
			"</div>" +
			'<div class="level-right">' +
			'<div class="level-item list-row-activity">' +
			'<button class="btn btn-xs btn-default smd-go-btn" ' +
			'data-link="' +
			(row.signature_link || "") +
			'" ' +
			'title="' +
			__("Go to Signature Link") +
			'" ' +
			(row.signature_link ? "" : "disabled") +
			">" +
			'<i class="fa fa-external-link fa-fw"></i>' +
			"</button>" +
			'<button class="btn btn-xs btn-default smd-copy-btn" ' +
			'data-link="' +
			(row.signature_link || "") +
			'" ' +
			'title="' +
			__("Copy Signature Link") +
			'" ' +
			(row.signature_link ? "" : "disabled") +
			">" +
			'<i class="fa fa-copy fa-fw"></i>' +
			"</button>" +
			'<button class="btn btn-xs btn-primary smd-refresh-btn" ' +
			'data-name="' +
			frappe.utils.escape_html(row.name) +
			'" ' +
			'title="' +
			__("Regenerate Signature Link") +
			'">' +
			'<i class="fa fa-refresh fa-fw"></i>' +
			"</button>" +
			"</div>" +
			"</div>" +
			"</div>" +
			"</div>";
	});

	$c.html(
		'<div class="frappe-list" style="margin-bottom: 30px">' +
			'<div class="result no-assign-to">' +
			header +
			body +
			"</div>" +
			"</div>",
	);

	// Action: Go to Link
	$c.off("click.smd_go").on("click.smd_go", ".smd-go-btn", function () {
		var link = $(this).data("link");
		if (link) window.open(link, "_blank");
	});

	// Action: Copy Link
	$c.off("click.smd_copy").on("click.smd_copy", ".smd-copy-btn", function () {
		var link = $(this).data("link");
		if (link) {
			frappe.utils.copy_to_clipboard(link);
			frappe.show_alert({ message: __("Link copied to clipboard"), indicator: "blue" });
		}
	});

	// Action: Regenerate Link
	$c.off("click.smd_refresh").on("click.smd_refresh", ".smd-refresh-btn", function () {
		var swo_name = $(this).data("name");
		frappe.call({
			method: "southwest.api.regenerate_swo_signature_link",
			args: { swo_name: swo_name },
			freeze: true,
			callback: function (r) {
				if (!r.exc) {
					frappe.show_alert({
						message: __("Signature link regenerated successfully"),
						indicator: "green",
					});
					refresh_smd(wrapper);
				}
			},
		});
	});
}

// ---------------------------------------------------------------------------
// PO Assignments table
// ---------------------------------------------------------------------------
function render_po_assignments_table(wrapper, rows) {
	var $c = $(wrapper.page.body).find("#smd-po-assignments-list-wrapper");
	if (!$c.length) return;

	if (!rows.length) {
		$c.html(
			'<div class="frappe-list" style="margin-bottom: 30px">' +
				'<div class="no-result text-muted flex justify-center align-center" style="min-height:160px">' +
				'<div class="msg-box no-border">' +
				"<p>" +
				__("No customers found.") +
				"</p>" +
				"</div>" +
				"</div>" +
				"</div>",
		);
		return;
	}

	var header =
		'<div class="list-row-container">' +
		'<header class="level list-row-head text-muted">' +
		'<div class="level-left list-header-subject">' +
		smd_col(__("Customer"), "list-subject level name", true) +
		smd_col(__("Customer Code"), "hidden-xs") +
		smd_col(__("PO Assignment"), "hidden-xs") +
		"</div>" +
		'<div class="level-right">' +
		'<span class="list-count">' +
		rows.length +
		" " +
		__("customers") +
		"</span>" +
		"</div>" +
		"</header>" +
		"</div>";

	var body = "";
	rows.forEach(function (row) {
		var active_po = row.active_po || '<span class="text-muted italic">' + __("No active assignment") + "</span>";

		body +=
			'<div class="list-row-container" tabindex="1">' +
			'<div class="level list-row">' +
			'<div class="level-left ellipsis">' +
			'<div class="list-row-col ellipsis list-subject level name">' +
			'<span class="level-item bold ellipsis">' +
			frappe.utils.escape_html(row.customer_name) +
			"</span>" +
			"</div>" +
			'<div class="list-row-col ellipsis hidden-xs text-muted">' +
			frappe.utils.escape_html(row.customer_id) +
			"</div>" +
			'<div class="list-row-col ellipsis hidden-xs">' + active_po + "</div>" +
			"</div>" +
			'<div class="level-right">' +
			'<div class="level-item list-row-activity">' +
			'<button class="btn btn-xs btn-default smd-po-history-btn" ' +
			'data-customer="' +
			frappe.utils.escape_html(row.customer_id) +
			'" ' +
			'title="' +
			__("View PO History") +
			'">' +
			'<i class="fa fa-history fa-fw"></i>' +
			"</button>" +
			"</div>" +
			"</div>" +
			"</div>" +
			"</div>";
	});

	$c.html(
		'<div class="frappe-list" style="margin-bottom: 30px">' +
			'<div class="result no-assign-to">' +
			header +
			body +
			"</div>" +
			"</div>",
	);

	$c.off("click.smd_po").on("click.smd_po", ".smd-po-history-btn", function () {
		var customer = $(this).data("customer");
		frappe.route_options = { customer: customer };
		frappe.set_route("List", "Customer PO Assignment");
	});
}
