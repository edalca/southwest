frappe.listview_settings["Service Work Order"] = {
	add_fields: ["status"],
	has_indicator_color: true,
	has_indicator_for_draft: true,

	get_indicator(doc) {
		const status_colors = {
			"New": "gray",
			"Programmed": "blue",
			"Repairing": "orange",
			"Partial Repair": "yellow",
			"Staged": "purple",
			"Completed": "green",
			"Billed": "green",
			"Issued": "green",
			"Closed": "green",
			"Cancelled": "red"
		};

		// Force use of the status field even if docstatus is 0 (Draft)
		let status = doc.status || "New";
		let color = status_colors[status] || "gray";

		return [__(status), color, "status,=," + status];
	},
};
