import frappe
from frappe.tests import IntegrationTestCase
from frappe.utils import add_days, add_to_date, now_datetime

from southwest.service_management.doctype.agenda_entry.agenda_entry import (
	get_agenda_entry,
	get_upcoming_agenda,
	process_agenda_alerts,
	toggle_agenda_subscription,
)


IGNORE_TEST_RECORD_DEPENDENCIES = ["Customer", "User"]


class IntegrationTestAgendaEntry(IntegrationTestCase):
	def test_home_only_returns_entries_that_have_not_finished(self):
		now = now_datetime()
		today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
		expired = frappe.get_doc(
			{
				"doctype": "Agenda Entry",
				"subject": "Expired home entry",
				"entry_type": "Reminder",
				"starts_on": add_to_date(now, hours=-1),
			}
		).insert(ignore_permissions=True)
		active_event = frappe.get_doc(
			{
				"doctype": "Agenda Entry",
				"subject": "Active home event",
				"entry_type": "Event",
				"starts_on": add_to_date(now, hours=-1),
				"ends_on": add_to_date(now, hours=1),
			}
		).insert(ignore_permissions=True)
		all_day = frappe.get_doc(
			{
				"doctype": "Agenda Entry",
				"subject": "All-day home entry",
				"entry_type": "Reminder",
				"starts_on": today_start,
				"all_day": 1,
			}
		).insert(ignore_permissions=True)

		visible_names = {entry.name for entry in get_upcoming_agenda(days=7, limit=100)}
		self.assertNotIn(expired.name, visible_names)
		self.assertIn(active_event.name, visible_names)
		self.assertIn(all_day.name, visible_names)

	def test_only_creator_can_edit(self):
		owner = self._create_agenda_user("agenda.owner@example.com")
		viewer = self._create_agenda_user("agenda.viewer@example.com")
		self.addCleanup(frappe.set_user, "Administrator")

		frappe.set_user(owner)
		doc = frappe.get_doc(
			{
				"doctype": "Agenda Entry",
				"subject": "Creator-only edit test",
				"entry_type": "Event",
				"starts_on": add_days(now_datetime(), 1),
			}
		).insert()
		self.assertTrue(get_agenda_entry(doc.name)["can_edit"])

		frappe.set_user(viewer)
		self.assertFalse(get_agenda_entry(doc.name)["can_edit"])
		with self.assertRaises(frappe.PermissionError):
			frappe.get_doc("Agenda Entry", doc.name).check_permission("write")

	@staticmethod
	def _create_agenda_user(email):
		if not frappe.db.exists("User", email):
			frappe.get_doc(
				{
					"doctype": "User",
					"email": email,
					"first_name": "Agenda",
					"enabled": 1,
					"send_welcome_email": 0,
				}
			).insert(ignore_permissions=True)
		user = frappe.get_doc("User", email)
		if "Agenda Manager" not in frappe.get_roles(email):
			user.add_roles("Agenda Manager")
		return email

	def test_creator_is_subscribed_and_alert_datetime_is_calculated(self):
		starts_on = add_days(now_datetime(), 2)
		doc = frappe.get_doc(
			{
				"doctype": "Agenda Entry",
				"subject": "Test reminder",
				"entry_type": "Reminder",
				"starts_on": starts_on,
				"alerts": [{"remind_before": 2, "remind_before_unit": "Hours"}],
			}
		).insert(ignore_permissions=True)

		self.assertIn(frappe.session.user, [row.user for row in doc.subscribers])
		self.assertEqual(
			doc.alerts[0].alert_datetime,
			add_to_date(starts_on, hours=-2),
		)

	def test_new_entry_subscribes_all_active_agenda_users(self):
		owner = self._create_agenda_user("agenda.default.owner@example.com")
		colleague = self._create_agenda_user("agenda.default.colleague@example.com")
		self.addCleanup(frappe.set_user, "Administrator")

		frappe.set_user(owner)
		doc = frappe.get_doc(
			{
				"doctype": "Agenda Entry",
				"subject": "Default subscribers test",
				"entry_type": "Reminder",
				"starts_on": add_days(now_datetime(), 1),
			}
		).insert()

		subscribers = {row.user for row in doc.subscribers}
		self.assertIn(owner, subscribers)
		self.assertIn(colleague, subscribers)

	def test_creator_cannot_remove_own_subscription(self):
		owner = self._create_agenda_user("agenda.required.owner@example.com")
		colleague = self._create_agenda_user("agenda.required.colleague@example.com")
		self.addCleanup(frappe.set_user, "Administrator")

		frappe.set_user(owner)
		doc = frappe.get_doc(
			{
				"doctype": "Agenda Entry",
				"subject": "Required creator subscription",
				"entry_type": "Task",
				"starts_on": add_days(now_datetime(), 1),
				"subscribers": [{"user": owner}, {"user": colleague}],
			}
		).insert()

		with self.assertRaises(frappe.ValidationError):
			toggle_agenda_subscription(doc.name, subscribe=0)

		doc.reload()
		doc.set("subscribers", [row for row in doc.subscribers if row.user != owner])
		doc.save()
		self.assertIn(owner, [row.user for row in doc.subscribers])

	def test_duplicate_subscribers_and_alerts_are_removed(self):
		doc = frappe.get_doc(
			{
				"doctype": "Agenda Entry",
				"subject": "Duplicate test",
				"entry_type": "Task",
				"starts_on": add_days(now_datetime(), 1),
				"subscribers": [
					{"user": frappe.session.user},
					{"user": frappe.session.user},
				],
				"alerts": [
					{"remind_before": 1, "remind_before_unit": "Days"},
					{"remind_before": 1, "remind_before_unit": "Days"},
				],
			}
		).insert(ignore_permissions=True)

		self.assertEqual(len(doc.subscribers), 1)
		self.assertEqual(len(doc.alerts), 1)

	def test_end_cannot_be_before_start(self):
		starts_on = add_days(now_datetime(), 2)
		doc = frappe.get_doc(
			{
				"doctype": "Agenda Entry",
				"subject": "Invalid dates",
				"entry_type": "Event",
				"starts_on": starts_on,
				"ends_on": add_days(starts_on, -1),
			}
		)
		with self.assertRaises(frappe.ValidationError):
			doc.insert(ignore_permissions=True)

	def test_alert_cannot_be_scheduled_in_the_past(self):
		doc = frappe.get_doc(
			{
				"doctype": "Agenda Entry",
				"subject": "Invalid alert lead time",
				"entry_type": "Event",
				"starts_on": add_days(now_datetime(), 2),
				"alerts": [{"remind_before": 7, "remind_before_unit": "Days"}],
			}
		)
		with self.assertRaises(frappe.ValidationError):
			doc.insert(ignore_permissions=True)

	def test_task_does_not_keep_an_event_end(self):
		starts_on = add_days(now_datetime(), 2)
		doc = frappe.get_doc(
			{
				"doctype": "Agenda Entry",
				"subject": "Task without event duration",
				"entry_type": "Task",
				"starts_on": starts_on,
				"ends_on": add_days(starts_on, 1),
			}
		).insert(ignore_permissions=True)

		self.assertIsNone(doc.ends_on)

	def test_default_alert_is_sent_to_creator(self):
		doc = frappe.get_doc(
			{
				"doctype": "Agenda Entry",
				"subject": "Due reminder",
				"entry_type": "Reminder",
				"starts_on": add_to_date(now_datetime(), minutes=5),
			}
		).insert(ignore_permissions=True)

		self.assertEqual(len(doc.alerts), 1)
		self.assertEqual(doc.alerts[0].remind_before, 0)
		frappe.db.set_value(
			"Agenda Entry Alert",
			doc.alerts[0].name,
			"alert_datetime",
			add_to_date(now_datetime(), minutes=-1),
		)
		process_agenda_alerts()

		self.assertEqual(
			frappe.db.get_value("Agenda Entry Alert", doc.alerts[0].name, "sent"),
			1,
		)
		self.assertTrue(
			frappe.db.exists(
				"Notification Log",
				{
					"for_user": frappe.session.user,
					"document_type": "Agenda Entry",
					"document_name": doc.name,
				},
			)
		)
