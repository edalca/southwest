frappe.listview_settings["Service Work Order"] = {
	add_fields: ["status"],

	get_indicator(doc) {
		const colors = {
			New: "gray",
			Programmed: "blue",
			Released: "blue",
			Repairing: "orange",
			"Partial Repair": "yellow",
			Staged: "purple",
			Completed: "green",
			Cancelled: "red",
		};
		const status = doc.status || "New";
		return [__(status), colors[status] || "gray", `status,=,${status}`];
	},
};
