frappe.ui.form.on("Item", {
	refresh(frm) {
		toggle_southwest_fields(frm);
	},

	is_stock_item(frm) {
		toggle_southwest_fields(frm);
	},

	// When owner type changes, clear the owner field so the user re-selects it
	custom_owner_type(frm) {
		frm.set_value("custom_customer", "");
		// Show/hide the owner field based on whether a type is selected
		frm.set_df_property("custom_customer", "hidden", frm.doc.custom_owner_type ? 0 : 1);
		frm.refresh_field("custom_customer");
	},

	// Generate Code button click
	custom_generate_code_btn(frm) {
		generate_item_code(frm);
	},
});

/**
 * Show/hide and toggle the required flag for the southwest fields.
 * Only custom_owner_type and custom_customer are required when is_stock_item = 1.
 * component and part_color are always optional.
 */
function toggle_southwest_fields(frm) {
	const is_stock = !!frm.doc.is_stock_item;

	// Section and button visibility
	frm.set_df_property("custom_southwest_section", "hidden", is_stock ? 0 : 1);
	frm.set_df_property("custom_generate_code_btn", "hidden", is_stock ? 0 : 1);

	// Owner type — required when stock item
	frm.set_df_property("custom_owner_type", "hidden", is_stock ? 0 : 1);
	frm.set_df_property("custom_owner_type", "reqd", is_stock ? 1 : 0);

	// Owner (Dynamic Link) — shown only when owner type is set
	const has_type = is_stock && !!frm.doc.custom_owner_type;
	frm.set_df_property("custom_customer", "hidden", has_type ? 0 : 1);
	frm.set_df_property("custom_customer", "reqd", has_type ? 1 : 0);

	// Component and Part Color — always optional, shown when stock item
	frm.set_df_property("custom_component", "hidden", is_stock ? 0 : 1);
	frm.set_df_property("custom_component", "reqd", 0);
	frm.set_df_property("custom_part_color", "hidden", is_stock ? 0 : 1);
	frm.set_df_property("custom_part_color", "reqd", 0);

	frm.refresh_fields([
		"custom_southwest_section",
		"custom_generate_code_btn",
		"custom_owner_type",
		"custom_customer",
		"custom_component",
		"custom_part_color",
	]);
}

/**
 * Build the item code from the owner's code + optional component/name/color.
 *
 * Format:  {owner_code}-{component}/{item_name}-{color}
 * Parts are omitted when empty.
 *
 * Customer owner → uses custom_customer_code from Customer doctype
 * Company owner  → uses abbr from Company doctype
 */
function generate_item_code(frm) {
	const { custom_owner_type, custom_customer } = frm.doc;

	if (!custom_owner_type || !custom_customer) {
		frappe.msgprint(__("Please select an Owner Type and Owner before generating the code."));
		return;
	}

	if (custom_owner_type === "Customer") {
		frappe.db.get_value("Customer", custom_customer, "custom_customer_code", (r) => {
			if (!r || !r.custom_customer_code) {
				frappe.msgprint(__("The selected Customer does not have a Customer Code defined."));
				return;
			}
			apply_item_code(frm, r.custom_customer_code);
		});
	} else if (custom_owner_type === "Company") {
		frappe.db.get_value("Company", custom_customer, "abbr", (r) => {
			if (!r || !r.abbr) {
				frappe.msgprint(__("The selected Company does not have an abbreviation defined."));
				return;
			}
			apply_item_code(frm, r.abbr);
		});
	}
}

/**
 * Combine owner_code with the optional fields and set item_code.
 */
function apply_item_code(frm, owner_code) {
	const { custom_component, custom_part_color, item_name } = frm.doc;

	let code = owner_code;
	if (custom_component) code += `-${custom_component}`;
	if (item_name)        code += `/${item_name}`;
	if (custom_part_color) code += `-${custom_part_color}`;

	frm.set_value("item_code", code);
}
