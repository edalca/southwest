function update_equipment_details_grid(frm) {
	const has_types = (frm.doc.equipment_types || []).some(r => r.equipment_type);
	frm.fields_dict.equipment_details.grid.cannot_add_rows = !has_types;
	frm.fields_dict.equipment_details.grid.refresh();
}

frappe.ui.form.on("Service Contract", {
	onload(frm) {
		southwest.utils.set_default_company(frm);
	},
	refresh(frm) {
		update_equipment_details_grid(frm);
	},
	setup(frm) {
		southwest.utils.set_default_company(frm);

		frm.set_query("equipment", "equipment_details", function (doc) {
			const filters = { customer: doc.customer };
			const selected_types = (doc.equipment_types || [])
				.map(r => r.equipment_type)
				.filter(Boolean);
			if (selected_types.length) {
				filters["equipment_type"] = ["in", selected_types];
			}
			return { filters };
		});
	},
	customer(frm) {
		frm.set_value("equipment_details", []);
	},
	equipment_types(frm) {
		frm.set_value("equipment_details", []);
		update_equipment_details_grid(frm);
	},
});
