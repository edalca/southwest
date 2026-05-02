function update_item_field_description(frm, fieldname, placeholder) {
	const val = frm.doc[fieldname];
	const map = frm._item_field_map || {};
	const fields = frm._item_fields_list || [];

	let desc = placeholder;
	if (val && map[val]) {
		desc += `<br><b>${__("Selected")}: ${val} — ${map[val]}</b>`;
	}
	if (fields.length) {
		const chips = fields
			.map((f) => `<a href="#" style="margin:2px;display:inline-block;padding:1px 6px;border:1px solid #d1d8dd;border-radius:10px;font-size:11px;cursor:pointer" data-fieldname="${f.fieldname}">${f.fieldname} <span style="color:#8d99a6">${f.label}</span></a>`)
			.join(" ");
		desc += `<br><div style="margin-top:6px">${chips}</div>`;
	}
	frm.set_df_property(fieldname, "description", desc);

	setTimeout(() => {
		$(frm.fields_dict[fieldname].wrapper)
			.find("[data-fieldname]")
			.off("click.ifd_" + fieldname)
			.on("click.ifd_" + fieldname, function (e) {
				e.preventDefault();
				frm.set_value(fieldname, $(this).data("fieldname"));
			});
	}, 100);
}

function refresh_item_field_descriptions(frm) {
	update_item_field_description(frm, "invoice_item_display_field",
		__("Item field (Data type) to show in the Item Code column. Leave blank to use name."));
	update_item_field_description(frm, "invoice_item_description_field",
		__("Item field (Data type) to show in the Description column. Leave blank to use the invoice line description."));
}

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

	onload(frm) {
		frappe.model.with_doctype("Item", function () {
			const meta = frappe.get_meta("Item");
			const fields = meta.fields
				.filter((f) => f.fieldtype === "Data" && !f.hidden)
				.sort((a, b) => (a.label || "").localeCompare(b.label || ""));
			frm._item_field_map = Object.fromEntries(fields.map((f) => [f.fieldname, f.label]));
			frm._item_fields_list = fields;
			refresh_item_field_descriptions(frm);
		});
	},

	invoice_item_display_field(frm) {
		refresh_item_field_descriptions(frm);
	},

	invoice_item_description_field(frm) {
		refresh_item_field_descriptions(frm);
	},
});
