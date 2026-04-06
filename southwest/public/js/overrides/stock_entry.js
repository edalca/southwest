frappe.ui.form.on("Stock Entry", {
	refresh(frm) {
		_lock_swo_fields(frm);
	},
});

/**
 * When this Stock Entry was created from a Service Work Order,
 * pull the stock_entry_type from Service Manager Settings and
 * lock it read-only so users cannot change the entry type.
 */
function _lock_swo_fields(frm) {
	if (frm.doc.custom_source_doctype !== "Service Work Order") return;

	frm.set_df_property("stock_entry_type", "read_only", 1);

	// If entry type is not yet set, fetch from settings and apply.
	if (!frm.doc.stock_entry_type) {
		frappe.db.get_single_value(
			"Service Manager Settings",
			"default_swo_stock_entry_type"
		).then((entry_type) => {
			if (entry_type) {
				frm.set_value("stock_entry_type", entry_type);
			}
		});
	}
}
