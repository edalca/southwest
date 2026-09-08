frappe.ui.form.on("Agenda Entry", {
	setup(frm) {
		frm.set_query("user", "subscribers", () => ({
			filters: { enabled: 1, user_type: "System User" },
		}));
	},

	refresh(frm) {
		apply_entry_type_layout(frm);
		if (frm.is_new()) return;
		const subscribed = (frm.doc.subscribers || []).some(
			(row) => row.user === frappe.session.user,
		);
		frm.add_custom_button(subscribed ? __("Stop Notifications") : __("Notify Me"), () => {
			frappe.call({
				method: "southwest.service_management.doctype.agenda_entry.agenda_entry.toggle_agenda_subscription",
				args: { name: frm.doc.name, subscribe: subscribed ? 0 : 1 },
				callback: () => frm.reload_doc(),
			});
		});
	},

	entry_type(frm) {
		apply_entry_type_layout(frm);
		if (frm.doc.entry_type !== "Event") {
			frm.set_value("ends_on", null);
		}
	},
});

function apply_entry_type_layout(frm) {
	const is_event = frm.doc.entry_type === "Event";
	const is_task = frm.doc.entry_type === "Task";

	frm.toggle_display(["ends_on"], is_event);
	frm.toggle_display("priority", is_task);
	frm.set_df_property(
		"starts_on",
		"label",
		is_event ? __("Starts On") : is_task ? __("Due On") : __("Remind On"),
	);
	frm.set_df_property("all_day", "label", is_event ? __("All Day") : __("No Specific Time"));
	frm.set_df_property("description", "label", is_task ? __("Details") : __("Description"));
}
