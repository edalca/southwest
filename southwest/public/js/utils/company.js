/**
 * southwest.utils.set_default_company(frm)
 *
 * Sets the `company` field to the system default and hides it when only one
 * company exists. When multiple companies are configured the field stays
 * visible and is pre-filled with the global default so the user can change it.
 *
 * Usage:
 *   frappe.ui.form.on("My DocType", {
 *       setup(frm) { southwest.utils.set_default_company(frm); },
 *   });
 */

window.southwest = window.southwest || {};
southwest.utils = southwest.utils || {};

southwest.utils.set_default_company = function (frm) {
	frappe.db.get_list("Company", { fields: ["name"], limit: 2 }).then((companies) => {
		if (companies.length === 1) {
			if (!frm.doc.company) {
				frm.set_value("company", companies[0].name);
			}
			frm.set_df_property("company", "hidden", 1);
		} else {
			if (!frm.doc.company) {
				frappe.db.get_default("company").then((default_company) => {
					if (default_company) frm.set_value("company", default_company);
				});
			}
		}
	});
};
