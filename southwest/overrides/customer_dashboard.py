from frappe import _

def get_data(data):
	return {
		"fieldname": "customer",
		"transactions": [
			{
				"label": _("Service Management"),
				"items": ["Customer PO Assignment"],
			},
		],
	}
