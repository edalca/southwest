frappe.ui.form.on("Sales Invoice", {
	refresh(frm) {
		_lock_swo_fields(frm);
	},
});

/**
 * When this Sales Invoice was generated from a Service Work Order,
 * force update_stock = 1 and make it read-only so users cannot
 * accidentally uncheck it or change the stock posting flag.
 */
function _lock_swo_fields(frm) {
	if (frm.doc.custom_source_doctype !== "Service Work Order") return;

	frm.set_value("update_stock", 1);
	frm.set_df_property("update_stock", "read_only", 1);
}
