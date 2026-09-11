frappe.ui.form.on("Agenda Entry", {
	setup(frm) {
		frm.set_query("user", "subscribers", () => ({
			filters: { enabled: 1, user_type: "System User" },
		}));
	},

	onload(frm) {
		set_default_schedule_and_alert(frm);
		set_default_subscribers(frm);
	},

	refresh(frm) {
		apply_entry_type_layout(frm);
		if (frm.is_new()) return;
		if (frm.doc.owner === frappe.session.user) return;
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

function set_default_schedule_and_alert(frm) {
	if (!frm.is_new()) return;
	const starts_on = moment().add(1, "day").seconds(0).milliseconds(0);
	if (!frm.doc.starts_on) frm.set_value("starts_on", starts_on.format("YYYY-MM-DD HH:mm:ss"));
	if (!frm.doc.ends_on) frm.set_value("ends_on", starts_on.clone().add(1, "hour").format("YYYY-MM-DD HH:mm:ss"));
	if (!(frm.doc.alerts || []).length) {
		frm.add_child("alerts", { remind_before: 0, remind_before_unit: "Minutes" });
		frm.refresh_field("alerts");
	}
}

async function set_default_subscribers(frm) {
	if (!frm.is_new() || frm.__agenda_subscribers_initialized) return;
	frm.__agenda_subscribers_initialized = true;

	const response = await frappe.call({
		method: "southwest.service_management.doctype.agenda_entry.agenda_entry.get_agenda_users",
	});
	if (!frm.is_new()) return;

	const users = (response.message || []).map((user) => user.name);
	if (!users.includes(frappe.session.user)) users.push(frappe.session.user);
	const selected = new Set((frm.doc.subscribers || []).map((row) => row.user));
	for (const user of users) {
		if (!selected.has(user)) frm.add_child("subscribers", { user });
	}
	frm.refresh_field("subscribers");
}

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
