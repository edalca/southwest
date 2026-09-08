import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import add_days, add_to_date, cint, get_datetime, now_datetime


AGENDA_ROLES = {"Agenda User", "Agenda Manager", "System Manager"}
ALERT_UNIT_MINUTES = {"Minutes": 1, "Hours": 60, "Days": 1440}


class AgendaEntry(Document):
	def before_insert(self):
		self._subscribe_creator()
		self._add_default_alert()

	def validate(self):
		self._normalize_type_fields()
		self._validate_dates()
		self._normalize_subscribers()
		self._prepare_alerts()
		self._set_completion_time()

	def _normalize_type_fields(self):
		if self.entry_type != "Event":
			self.ends_on = None

	def _subscribe_creator(self):
		creator = frappe.session.user
		if creator and creator != "Guest" and not any(row.user == creator for row in self.subscribers):
			self.append(
				"subscribers",
				{"user": creator, "added_by": creator, "added_on": now_datetime()},
			)

	def _add_default_alert(self):
		if not self.alerts:
			self.append("alerts", {"remind_before": 0, "remind_before_unit": "Minutes"})

	def _validate_dates(self):
		if self.ends_on and get_datetime(self.ends_on) < get_datetime(self.starts_on):
			frappe.throw(_("Ends On cannot be before Starts On."))

	def _normalize_subscribers(self):
		seen = set()
		for row in list(self.subscribers):
			if not row.user:
				self.remove(row)
				continue
			if row.user in seen:
				self.remove(row)
				continue
			seen.add(row.user)
			if not row.added_by:
				row.added_by = frappe.session.user
			if not row.added_on:
				row.added_on = now_datetime()

	def _prepare_alerts(self):
		seen = set()
		for row in list(self.alerts):
			amount = cint(row.remind_before)
			if amount < 0:
				frappe.throw(_("Remind Before cannot be negative."))
			if row.remind_before_unit not in ALERT_UNIT_MINUTES:
				frappe.throw(_("Invalid reminder unit."))

			key = (amount, row.remind_before_unit)
			if key in seen:
				self.remove(row)
				continue
			seen.add(key)

			alert_datetime = add_to_date(
				get_datetime(self.starts_on),
				minutes=-(amount * ALERT_UNIT_MINUTES[row.remind_before_unit]),
			)
			if row.name and not row.is_new():
				previous = frappe.db.get_value("Agenda Entry Alert", row.name, "alert_datetime")
				if previous and get_datetime(previous) != get_datetime(alert_datetime):
					row.sent = 0
					row.sent_on = None
			row.alert_datetime = alert_datetime

	def _set_completion_time(self):
		if self.status == "Completed" and not self.completed_on:
			self.completed_on = now_datetime()
		elif self.status != "Completed":
			self.completed_on = None


def _require_agenda_role():
	if frappe.session.user == "Administrator":
		return
	if not AGENDA_ROLES.intersection(frappe.get_roles()):
		frappe.throw(_("You do not have access to the agenda."), frappe.PermissionError)


@frappe.whitelist()
def get_agenda_entries(start=None, end=None, subscribed_only=0, status=None, limit=500):
	"""Return shared agenda entries visible to the current user."""
	_require_agenda_role()

	filters = []
	if start:
		filters.append(["Agenda Entry", "starts_on", ">=", get_datetime(start)])
	if end:
		filters.append(["Agenda Entry", "starts_on", "<", get_datetime(end)])
	if status:
		filters.append(["Agenda Entry", "status", "=", status])

	if cint(subscribed_only):
		subscribed_names = frappe.get_all(
			"Agenda Entry Subscriber",
			filters={"user": frappe.session.user},
			pluck="parent",
		)
		if not subscribed_names:
			return []
		filters.append(["Agenda Entry", "name", "in", subscribed_names])

	entries = frappe.get_list(
		"Agenda Entry",
		filters=filters,
		fields=[
			"name",
			"subject",
			"entry_type",
			"status",
			"priority",
			"starts_on",
			"ends_on",
			"all_day",
			"customer",
			"description",
			"owner",
			"creation",
			"modified",
		],
		order_by="starts_on asc",
		limit=min(cint(limit) or 500, 1000),
	)
	_attach_subscription_data(entries)
	return entries


def _attach_subscription_data(entries):
	if not entries:
		return
	names = [entry.name for entry in entries]
	rows = frappe.get_all(
		"Agenda Entry Subscriber",
		filters={"parent": ["in", names]},
		fields=["parent", "user"],
		order_by="idx asc",
	)
	by_entry = {}
	for row in rows:
		by_entry.setdefault(row.parent, []).append(row.user)
	for entry in entries:
		entry["subscribers"] = by_entry.get(entry.name, [])
		entry["is_subscribed"] = frappe.session.user in entry["subscribers"]
		entry["can_edit"] = entry.owner == frappe.session.user


@frappe.whitelist()
def get_agenda_entry(name):
	_require_agenda_role()
	doc = frappe.get_doc("Agenda Entry", name)
	doc.check_permission("read")
	data = doc.as_dict()
	data["is_subscribed"] = any(row.user == frappe.session.user for row in doc.subscribers)
	data["can_edit"] = doc.owner == frappe.session.user
	return data


@frappe.whitelist()
def toggle_agenda_subscription(name, subscribe=1):
	"""Subscribe or unsubscribe only the current session user."""
	_require_agenda_role()
	doc = frappe.get_doc("Agenda Entry", name)
	doc.check_permission("read")
	user = frappe.session.user
	is_subscribed = any(row.user == user for row in doc.subscribers)

	if cint(subscribe) and not is_subscribed:
		doc.append(
			"subscribers",
			{"user": user, "added_by": user, "added_on": now_datetime()},
		)
	elif not cint(subscribe) and is_subscribed:
		doc.set("subscribers", [row for row in doc.subscribers if row.user != user])

	doc.save(ignore_permissions=True)
	return {"is_subscribed": bool(cint(subscribe))}


@frappe.whitelist()
def get_agenda_users():
	"""Return enabled users who have a role with agenda access."""
	_require_agenda_role()
	user_names = frappe.get_all(
		"Has Role",
		filters={"role": ["in", sorted(AGENDA_ROLES)]},
		pluck="parent",
	)
	if not user_names:
		return []
	return frappe.get_all(
		"User",
		filters={"name": ["in", list(set(user_names))], "enabled": 1},
		fields=["name", "full_name", "user_image"],
		order_by="full_name asc",
	)


@frappe.whitelist()
def get_upcoming_agenda(days=7, limit=20):
	"""Return only currently active or future followed entries for the PWA home."""
	_require_agenda_role()
	subscribed_names = frappe.get_all(
		"Agenda Entry Subscriber",
		filters={"user": frappe.session.user},
		pluck="parent",
	)
	if not subscribed_names:
		return []

	now = now_datetime()
	today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
	horizon = add_days(now, cint(days) or 7)
	row_limit = min(cint(limit) or 20, 100)
	fields = [
		"name",
		"subject",
		"entry_type",
		"status",
		"priority",
		"starts_on",
		"ends_on",
		"all_day",
		"customer",
		"owner",
	]

	def get_visible_entries(all_day, cutoff):
		return frappe.get_list(
			"Agenda Entry",
			filters=[
				["Agenda Entry", "name", "in", subscribed_names],
				["Agenda Entry", "status", "=", "Open"],
				["Agenda Entry", "all_day", "=", all_day],
				["Agenda Entry", "starts_on", "<=", horizon],
			],
			or_filters=[
				["Agenda Entry", "starts_on", ">=", cutoff],
				["Agenda Entry", "ends_on", ">=", cutoff],
			],
			fields=fields,
			order_by="starts_on asc",
			limit=row_limit,
		)

	entries_by_name = {}
	for entry in get_visible_entries(0, now) + get_visible_entries(1, today_start):
		entries_by_name[entry.name] = entry

	return sorted(
		entries_by_name.values(),
		key=lambda entry: get_datetime(entry.starts_on),
	)[:row_limit]


def process_agenda_alerts():
	"""Create Frappe Notification Log rows for agenda alerts that are due."""
	due_alerts = frappe.get_all(
		"Agenda Entry Alert",
		filters={"sent": 0, "alert_datetime": ["<=", now_datetime()]},
		fields=["name", "parent"],
		order_by="alert_datetime asc",
		limit=500,
	)
	for alert in due_alerts:
		doc = frappe.get_doc("Agenda Entry", alert.parent)
		if doc.status != "Open":
			frappe.db.set_value(
				"Agenda Entry Alert",
				alert.name,
				{"sent": 1, "sent_on": now_datetime()},
				update_modified=False,
			)
			continue

		for row in doc.subscribers:
			if not frappe.db.get_value("User", row.user, "enabled"):
				continue
			frappe.get_doc(
				{
					"doctype": "Notification Log",
					"subject": _("Agenda reminder: {0}").format(doc.subject),
					"email_content": doc.description or doc.subject,
					"for_user": row.user,
					"type": "Alert",
					"document_type": "Agenda Entry",
					"document_name": doc.name,
					"from_user": doc.owner,
				}
			).insert(ignore_permissions=True)

		frappe.db.set_value(
			"Agenda Entry Alert",
			alert.name,
			{"sent": 1, "sent_on": now_datetime()},
			update_modified=False,
		)
