import json

import frappe
from frappe import _
from frappe.model.document import Document

from southwest.service_management.doctype.service_manager_settings.service_manager_settings import (
	get_max_part_attachments,
)


#: Photos from a phone plus supplier documents — nothing else is useful on a part row.
#: HEIC/HEIF are accepted because iPhones still upload them when HEVC capture is on.
ALLOWED_ATTACHMENT_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp", "heic", "heif", "pdf"}


def parse_attachments(raw) -> list:
	"""
	Normalizes the stored `attachments` value into a list of file URLs.

	Accepts the JSON list written by the Desk control and the mobile app, and also
	a bare URL string, which is what rows created before multi-file support hold.
	Anything unparseable degrades to an empty list rather than blocking a save.
	"""
	if not raw:
		return []
	if isinstance(raw, list):
		values = raw
	else:
		raw = str(raw).strip()
		if raw.startswith("["):
			try:
				values = json.loads(raw)
			except (ValueError, TypeError):
				return []
			if not isinstance(values, list):
				return []
		elif raw.startswith("/") or raw.startswith("http"):
			# Legacy single-file rows held a bare Attach path.
			values = [raw]
		else:
			return []

	urls = []
	for value in values:
		url = str(value).strip()
		if url and url not in urls:
			urls.append(url)
	return urls


class ServiceWorkOrderItem(Document):
	def normalize_attachments(self):
		"""
		Rewrites `attachments` in canonical JSON form and refreshes `attachment_count`.

		Called from the parent's `validate`, since Frappe does not run controller
		hooks on child rows.
		"""
		urls = parse_attachments(self.attachments)
		label = self.item_code or self.part_number or self.description or _("part")

		# The Desk and mobile pickers already filter by type, but neither is
		# authoritative — the field is writable through the REST API as well.
		for url in urls:
			extension = url.split("?")[0].rsplit(".", 1)[-1].lower()
			if extension not in ALLOWED_ATTACHMENT_EXTENSIONS:
				frappe.throw(
					_("{0}: only images and PDF files can be attached to a part.").format(label)
				)

		limit = get_max_part_attachments()
		if len(urls) > limit:
			frappe.throw(
				_("{0} has {1} attachments, but only {2} are allowed per part.").format(
					label, len(urls), limit
				)
			)

		self.attachments = json.dumps(urls) if urls else None
		self.attachment_count = len(urls)
