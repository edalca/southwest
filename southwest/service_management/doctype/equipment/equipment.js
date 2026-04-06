frappe.ui.form.on("Equipment", {
	refresh(frm) {
		frm.set_intro(
			frm.is_new() ? __("Fill in the required fields. The Equipment ID will be generated automatically.") : ""
		);
	},
});
