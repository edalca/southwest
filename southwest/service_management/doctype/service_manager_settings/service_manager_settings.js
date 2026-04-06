frappe.ui.form.on("Service Manager Settings", {
	setup(frm) {
		const labor_fields = ["pm_labor_item", "labor_rate_item", "misc_labor_item"];
		labor_fields.forEach((f) => {
			frm.set_query(f, function () {
				return { filters: { is_stock_item: 0 } };
			});
		});

		frm.set_query("default_swo_stock_entry_type", function () {
			return { filters: { purpose: "Material Issue" } };
		});
	},
});
