import frappe

no_cache = 1


def get_context(context):
    context.no_cache = 1
    # frappe-ui reads window.csrf_token for every API call.
    # Frappe's website boot dict does not include csrf_token, so we inject it
    # explicitly here so the jinjaBootData template loop picks it up.
    boot = context.get("boot") or {}
    boot["csrf_token"] = frappe.sessions.get_csrf_token()
    context.boot = boot
