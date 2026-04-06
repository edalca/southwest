frappe.query_reports["Service Work Orders"] = {
	filters: [
		{
			fieldname: "from_date",
			label: __("From Date"),
			fieldtype: "Date",
			default: frappe.datetime.add_months(frappe.datetime.nowdate(), -1),
		},
		{
			fieldname: "to_date",
			label: __("To Date"),
			fieldtype: "Date",
			default: frappe.datetime.nowdate(),
		},
		{
			fieldname: "status",
			label: __("Status"),
			fieldtype: "Select",
			options:
				"\nNew\nProgrammed\nReleased\nRepairing\nPartial Repair\nStaged\nCompleted\nCancelled",
		},
		{
			fieldname: "customer",
			label: __("Customer"),
			fieldtype: "Link",
			options: "Customer",
		},
		{
			fieldname: "service_type",
			label: __("Service Type"),
			fieldtype: "Select",
			options: "\nPM Frequency\nMisc\nLabor Rate",
		},
		{
			fieldname: "responsible",
			label: __("Responsible"),
			fieldtype: "Link",
			options: "Employee",
		},
	],
};
