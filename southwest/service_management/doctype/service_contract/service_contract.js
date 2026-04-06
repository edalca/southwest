frappe.ui.form.on("Service Contract", {
	onload(frm) {
		southwest.utils.set_default_company(frm);
	},
	setup(frm) {
		southwest.utils.set_default_company(frm);

		frm.set_query("equipment", "equipment_details", function (doc) {
			return {
				filters: { customer: doc.customer },
			};
		});
	},
	customer(frm) {
		frm.set_value("equipment_details", []);
	},
});
