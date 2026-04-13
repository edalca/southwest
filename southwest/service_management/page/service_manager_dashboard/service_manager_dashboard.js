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
			render_smd_table(wrapper, data.pending_rows || []);
			render_invoice_table(wrapper, data.ready_to_invoice_rows || []);
			render_smd_signature_table(wrapper, data.waiting_signature_rows || []);

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
		smd_col(__("Work Order"), "hidden-xs") +
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
		var part_no = frappe.utils.escape_html(row.part_number || "—");
		var desc = frappe.utils.escape_html(row.description || "—");
		var qty = row.qty != null ? row.qty : "—";

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
			frappe.utils.escape_html(row.service_work_order || "—") +
			"</a>" +
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
					label: __("Work Order Number"),
					read_only: 1,
					default: $btn.data("swo"),
				},
				{
					fieldtype: "Data",
					fieldname: "service_work_order",
					hidden: 1,
					default: $btn.data("swo"),
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
		smd_col(__("PO Number"), "hidden-xs smd-col-right") +
		"</div>" +
		'<div class="level-right">' +
		'<span class="list-count">' +
		rows.length +
		" " +
		__("ready") +
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
			po +
			"</div>" +
			"</div>" +
			'<div class="level-right">' +
			'<div class="level-item list-row-activity">' +
			'<button class="btn btn-xs btn-primary smd-process-btn" ' +
			'data-name="' +
			frappe.utils.escape_html(row.name) +
			'" ' +
			'title="' +
			__("Process Billing & Stock") +
			'">' +
			'<i class="fa fa-play fa-fw"></i>' +
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
	} else if (tab_name === "assignments") {
		$(wrapper.page.body).find("#smd-assignments-section").show();
	} else if (tab_name === "billing") {
		$(wrapper.page.body).find("#smd-billing-section").show();
	} else if (tab_name === "signatures") {
		$(wrapper.page.body).find("#smd-signatures-section").show();
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
			"</ul>",
			"</div>",

			'<div id="smd-calendar-section" class="smd-tab-content">',
			get_smd_calendar_legend(),
			'<div id="smd-calendar-wrapper"></div>',
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
		".smd-empty-state{padding:40px;text-align:center;font-size:13px}",

		/* Native Tab Tweak - ensures correct cursor and spacing on custom page */
		".form-tabs .nav-link{cursor:pointer !important; font-weight: 500; font-size: 13px; color: var(--text-muted); border: none; background: transparent; padding: 10px 15px; margin-right: 5px;}",
		".form-tabs .nav-link.active{color: var(--text-color); border-bottom: 2px solid var(--primary-color) !important; font-weight: 600;}",
		".form-tabs .nav-link:hover:not(.active){color: var(--text-color); border-bottom: 2px solid var(--border-color);}",

		/* Calendar Legend */
		".smd-calendar-legend{display:flex; flex-wrap:wrap; gap:15px; margin-bottom:15px; padding:10px; background:var(--bg-light-gray); border-radius:var(--border-radius-sm)}",
		".legend-item{display:flex; align-items:center; font-size:12px; color:var(--text-muted); font-weight:500;}",
		".legend-dot{width:12px; height:12px; border-radius:50%; margin-right:6px; display:inline-block}",

		/* FullCalendar Scroll Fix */
		"#smd-calendar-section { height: calc(100vh - 270px); min-height: 500px; overflow: hidden; display: flex; flex-direction: column; background: #fff; }",
		"#smd-calendar-wrapper { flex: 1; overflow: hidden; display: flex; flex-direction: column; padding: 20px; }",
		"#smd-calendar-wrapper .fc { flex: 1; overflow: hidden; }",
		"#smd-calendar-wrapper .fc-view-harness { background: #fff; }",
		".fc-scroller-harness { background: #fff; }",
	].join("\n");
	document.head.appendChild(el);
}

function get_smd_calendar_legend() {
	var items = [
		{ color: "#3498db", label: __("New / Programmed") },
		{ color: "#f1c40f", label: __("Released / Start Repair") },
		{ color: "#e67e22", label: __("Repairing / Partial") },
		{ color: "#e74c3c", label: __("Staged / Signature") },
		{ color: "#2ecc71", label: __("Completed / Invoiced") },
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

	frappe.require(["calendar.bundle.js", "calendar.bundle.css"], function () {
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
				frappe.set_route("Form", "Service Work Order", info.event.id);
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
		New: "#3498db",
		Programmed: "#3498db",
		Released: "#f1c40f",
		"Start Repair": "#f1c40f",
		Repairing: "#e67e22",
		"Partial Repair": "#e67e22",
		Staged: "#e74c3c",
		"Waiting for Signature": "#e74c3c",
		Completed: "#2ecc71",
		Invoiced: "#2ecc71",
	};
	return map[status] || "#95a5a6";
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
			// Show success via tooltip or alert
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
