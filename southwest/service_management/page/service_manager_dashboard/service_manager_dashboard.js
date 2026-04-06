frappe.pages["service-manager-dashboard"].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Service Manager Dashboard"),
		single_column: true,
	});

	wrapper.page = page;

	inject_smd_styles();
	page.body.append(build_smd_html());

	page.add_inner_button(__("Refresh"), function () {
		refresh_smd(wrapper);
	});

	refresh_smd(wrapper);
};

frappe.pages["service-manager-dashboard"].on_page_show = function (wrapper) {
	refresh_smd(wrapper);
};

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
			render_smd_table(wrapper, data.pending_rows || []);
		},
	});
}

// ---------------------------------------------------------------------------
// KPI cards — native .widget.number-widget-box
// ---------------------------------------------------------------------------
function render_smd_kpis(wrapper, kpis) {
	var $grid = $(wrapper.page.body).find("#smd-kpi-grid");
	if (!$grid.length) return;

	var pa = kpis.pending_assignments || 0;
	var ws = kpis.waiting_signature  || 0;
	var ri = kpis.ready_to_invoice   || 0;

	$grid.html(
		smd_stat_card(__("Pending Part Assignments"), pa, pa > 0 ? "smd-val-red"    : "smd-val-muted") +
		smd_stat_card(__("Waiting for Signature"),    ws, ws > 0 ? "smd-val-orange" : "smd-val-muted") +
		smd_stat_card(__("Ready to Invoice"),         ri, ri > 0 ? "smd-val-green"  : "smd-val-muted")
	);
}

function smd_stat_card(label, value, value_cls) {
	return (
		'<div class="widget number-widget-box">' +
			'<div class="widget-head">' +
				'<div class="widget-label">' +
					'<div class="widget-title">' +
						'<span class="ellipsis" title="' + label + '">' + label + "</span>" +
					"</div>" +
				"</div>" +
			"</div>" +
			'<div class="widget-body">' +
				'<div class="widget-content">' +
					'<div class="number ' + (value_cls || "") + '">' + value + "</div>" +
				"</div>" +
			"</div>" +
			'<div class="widget-footer"></div>' +
		"</div>"
	);
}

// ---------------------------------------------------------------------------
// Pending assignments table — native .frappe-list structure
// ---------------------------------------------------------------------------
function render_smd_table(wrapper, rows) {
	var $c = $(wrapper.page.body).find("#smd-list-wrapper");
	if (!$c.length) return;

	if (!rows.length) {
		$c.html(
			'<div class="frappe-list">' +
				'<div class="no-result text-muted flex justify-center align-center" style="min-height:160px">' +
					'<div class="msg-box no-border">' +
						'<p>' + __("No pending part assignments — all items are assigned.") + "</p>" +
					"</div>" +
				"</div>" +
			"</div>"
		);
		return;
	}

	// Header
	var header =
		'<div class="list-row-container">' +
			'<header class="level list-row-head text-muted">' +
				'<div class="level-left list-header-subject">' +
					smd_col(__("Assignment ID"), "list-subject level name", true) +
					smd_col(__("Work Order"),   "hidden-xs") +
					smd_col(__("Part Number"),  "hidden-xs") +
					smd_col(__("Description"),  "hidden-xs") +
					smd_col(__("Qty"),          "hidden-xs smd-col-right") +
				"</div>" +
				'<div class="level-right">' +
					'<span class="list-count">' + rows.length + " " + __("pending") + "</span>" +
				"</div>" +
			"</header>" +
		"</div>";

	// Rows
	var body = "";
	rows.forEach(function (row) {
		var pa_link   = frappe.utils.get_form_link("Service Part Assignment", row.name);
		var swo_link  = frappe.utils.get_form_link("Service Work Order", row.service_work_order);
		var part_no   = frappe.utils.escape_html(row.part_number   || "—");
		var desc      = frappe.utils.escape_html(row.description   || "—");
		var qty       = row.qty != null ? row.qty : "—";

		body +=
			'<div class="list-row-container" tabindex="1">' +
				'<div class="level list-row">' +
					'<div class="level-left ellipsis">' +

						// Assignment ID — subject column
						'<div class="list-row-col ellipsis list-subject level name">' +
							'<span class="level-item bold ellipsis">' +
								'<a class="ellipsis" href="' + pa_link + '">' +
									frappe.utils.escape_html(row.name) +
								"</a>" +
							"</span>" +
						"</div>" +

						// Work Order
						'<div class="list-row-col ellipsis hidden-xs">' +
							'<a href="' + swo_link + '">' +
								frappe.utils.escape_html(row.service_work_order || "—") +
							"</a>" +
						"</div>" +

						// Part Number
						'<div class="list-row-col ellipsis hidden-xs text-muted">' + part_no + "</div>" +

						// Description
						'<div class="list-row-col ellipsis hidden-xs">' + desc + "</div>" +

						// Qty
						'<div class="list-row-col ellipsis hidden-xs smd-col-right text-muted">' + qty + "</div>" +

					"</div>" +

					// Action button
					'<div class="level-right">' +
						'<div class="level-item list-row-activity">' +
							'<button class="btn btn-xs btn-primary smd-assign-btn" ' +
								'data-name="' + frappe.utils.escape_html(row.name) + '" ' +
								'data-swo="' + frappe.utils.escape_html(row.service_work_order || "") + '" ' +
								'data-part="' + frappe.utils.escape_html(row.part_number || "") + '" ' +
								'data-desc="' + frappe.utils.escape_html(row.description || "") + '" ' +
								'data-qty="' + (row.qty != null ? row.qty : "") + '" ' +
								'data-date="' + frappe.utils.escape_html(row.scheduled_date || "") + '" ' +
								'title="' + __("Assign product to this part") + '">' +
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
				header + body +
			"</div>" +
		"</div>"
	);

	// Events
	$c.off("click.smd")
		.on("click.smd", ".smd-assign-btn", function () {
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
						default: $btn.data("date")
					},
					{
						fieldtype: "Data",
						fieldname: "swo_display",
						label: __("Work Order Number"),
						read_only: 1,
						default: $btn.data("swo")
					},
					{
						fieldtype: "Data",
						fieldname: "service_work_order",
						hidden: 1,
						default: $btn.data("swo")
					},
					{
						fieldtype: "Data",
						fieldname: "part_number",
						label: __("Part Number"),
						read_only: 1,
						default: $btn.data("part")
					},
					{
						fieldtype: "Small Text",
						fieldname: "description",
						label: __("Description"),
						read_only: 1,
						default: $btn.data("desc")
					},
					{
						fieldtype: "Float",
						fieldname: "qty",
						label: __("Qty"),
						read_only: 1,
						default: parseFloat($btn.data("qty")) || 0
					},
					{
						fieldtype: "Link",
						fieldname: "item_code",
						label: __("Product (Item)"),
						options: "Item",
						reqd: 1
					}
				],
				primary_action_label: __("Save & Assign"),
				primary_action: function (values) {
					frappe.call({
						method: "frappe.client.set_value",
						args: {
							doctype: "Service Part Assignment",
							name: row_name,
							fieldname: {
								item_code: values.item_code,
								status: "Assigned"
							}
						},
						freeze: true,
						callback: function (r) {
							if (!r.exc) {
								frappe.show_alert({ message: __('Assigned successfully'), indicator: 'green' });
								d.hide();
								refresh_smd(wrapper);
							}
						}
					});
				}
			});
			d.show();
		});
}

function smd_col(label, extra_cls, is_subject) {
	var base = "list-row-col ellipsis" + (is_subject ? " list-subject level name" : "");
	return '<div class="' + base + " " + (extra_cls || "") + '"><span>' + label + "</span></div>";
}

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------
function render_smd_loading(wrapper) {
	$(wrapper.page.body).find("#smd-list-wrapper").html(
		'<div class="frappe-list">' +
			'<div class="smd-empty-state text-muted">' + __("Loading…") + "</div>" +
		"</div>"
	);
	$(wrapper.page.body).find("#smd-kpi-grid").html(
		'<div class="smd-empty-state text-muted">' + __("Loading…") + "</div>"
	);
}

// ---------------------------------------------------------------------------
// DOM skeleton injected into page.body
// ---------------------------------------------------------------------------
function build_smd_html() {
	return $([
		'<div class="smd-wrapper">',
			'<div id="smd-kpi-grid" class="smd-kpi-grid"></div>',
			'<div class="smd-section-title">' + __("Pending Part Assignments") + "</div>",
			'<div id="smd-list-wrapper"></div>',
		"</div>",
	].join(""));
}

// ---------------------------------------------------------------------------
// Styles — injected once, uses Frappe CSS variables (light + dark safe)
// ---------------------------------------------------------------------------
function inject_smd_styles() {
	if (document.getElementById("smd-styles")) return;
	var el = document.createElement("style");
	el.id = "smd-styles";
	el.textContent = [
		/* Layout */
		".smd-wrapper{padding:var(--padding-lg,24px)}",

		/* KPI grid — 3 equal columns, wraps on mobile */
		".smd-kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:28px}",
		"@media(max-width:768px){.smd-kpi-grid{grid-template-columns:1fr 1fr}}",
		"@media(max-width:480px){.smd-kpi-grid{grid-template-columns:1fr}}",

		/* KPI value color overrides inside native .widget */
		".smd-val-red{color:var(--red,#e74c3c)}",
		".smd-val-orange{color:var(--orange,#e67e22)}",
		".smd-val-green{color:var(--green,#27ae60)}",
		".smd-val-muted{color:var(--text-muted,#8d99a6)}",

		/* Section title */
		".smd-section-title{font-size:var(--text-md,13px);font-weight:600;margin-bottom:10px;color:var(--heading-color,#1f272e);text-transform:uppercase;letter-spacing:.04em}",

		/* Right-aligned qty column */
		".smd-col-right{text-align:right}",

		/* Loading / empty state */
		".smd-empty-state{padding:40px;text-align:center;font-size:13px}",
	].join("\n");
	document.head.appendChild(el);
}
