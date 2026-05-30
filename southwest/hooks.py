app_name = "southwest"

app_title = "Southwest"
app_publisher = "Edwin Carrillo"
app_description = "Custom adaptation for Southwest company built on top of ERPNext + HRMS"
app_email = "edwinalonso162@hotmail.com"
app_license = "mit"
app_version = "16.5.16"
# Installation hooks
after_install = "southwest.setup.after_install"
after_migrate = "southwest.setup.after_install"
before_uninstall = "southwest.setup.before_uninstall"

# Global JS bundle loaded on every desk page
app_include_js = [
	"southwest.bundle.js",
]

# Client scripts injected into ERPNext doctypes
doctype_js = {
	"Item": "public/js/overrides/item.js",
	"Sales Invoice": "public/js/overrides/sales_invoice.js",
	"Stock Entry": "public/js/overrides/stock_entry.js",
}

# Apps
# ------------------

required_apps = ["hrms"]

# Each item in the list will be shown as an app in the apps page
add_to_apps_screen = [
	{
		"name": "southwest",
		"logo": "/assets/southwest/logo.png",
		"title": "Southwest",
		"route": "/southwest",
	}
]

# Redirect all /southwest/* sub-routes to the SPA entry point.
# work-order-view lives outside /southwest/ to avoid the SPA catch-all.
website_route_rules = [
	{"from_route": "/work-order-view/<name>", "to_route": "work-order-view"},
	{"from_route": "/southwest/<path:app_path>", "to_route": "southwest"},
]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/southwest/css/southwest.css"
# app_include_js = "/assets/southwest/js/southwest.js"

# include js, css files in header of web template
# web_include_css = "/assets/southwest/css/southwest.css"
# web_include_js = "/assets/southwest/js/southwest.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "southwest/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "southwest/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# automatically load and sync documents of this doctype from downstream apps
# importable_doctypes = [doctype_1]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "southwest.utils.jinja_methods",
# 	"filters": "southwest.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "southwest.install.before_install"
# after_install = "southwest.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "southwest.uninstall.before_uninstall"
# after_uninstall = "southwest.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "southwest.utils.before_app_install"
# after_app_install = "southwest.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "southwest.utils.before_app_uninstall"
# after_app_uninstall = "southwest.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "southwest.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# Document Events
# ---------------
# Hook on document methods and events

doc_events = {
    "Sales Invoice": {
        "before_insert": "southwest.overrides.sales_invoice_events.before_insert",
        "validate": "southwest.overrides.sales_invoice_events.validate",
        "on_submit": "southwest.overrides.sales_invoice_events.on_submit",
    },
    "Stock Entry": {
        "on_submit": "southwest.overrides.stock_entry_events.on_submit",
    },
}

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"southwest.tasks.all"
# 	],
# 	"daily": [
# 		"southwest.tasks.daily"
# 	],
# 	"hourly": [
# 		"southwest.tasks.hourly"
# 	],
# 	"weekly": [
# 		"southwest.tasks.weekly"
# 	],
# 	"monthly": [
# 		"southwest.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "southwest.install.before_tests"

# Extend DocType Class
# ------------------------------
#
# Specify custom mixins to extend the standard doctype controller.
# extend_doctype_class = {
# 	"Task": "southwest.custom.task.CustomTaskMixin"
# }

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "southwest.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
doctype_dashboards = {
	"Customer": "southwest.overrides.customer_dashboard.get_data"
}

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["southwest.utils.before_request"]
# after_request = ["southwest.utils.after_request"]

# Job Events
# ----------
# before_job = ["southwest.utils.before_job"]
# after_job = ["southwest.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"southwest.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

# Translation
# ------------
# List of apps whose translatable strings should be excluded from this app's translations.
# ignore_translatable_strings_from = []

