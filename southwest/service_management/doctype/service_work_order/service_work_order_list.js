frappe.listview_settings["Service Work Order"] = {
	add_fields: ["status"],
	has_indicator_color: true,

	get_indicator(doc) {
		const colors = {
			New: "gray",
			Programmed: "blue",
			Repairing: "orange",
			"Partial Repair": "yellow",
			Staged: "purple",
			Completed: "green",
			Billed: "green",
			Issued: "green",
			Closed: "green",
			Cancelled: "red",
		};
		const status = doc.status || "New";
		return [__(status), colors[status] || "gray", `status,=,${status}`];
	},
};
