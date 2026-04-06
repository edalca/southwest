import frappe


def get_next_sequence(initial_current, padding, *args):
    """
    Returns the next formatted sequence value for the given key derived from args.

    The sequence name is built by joining args with a space, converting to snake_case
    via frappe.scrub, and appending '_id_seq'.
    Example: args=("Sales Invoice", "Southwest") -> "sales_invoice_southwest_id_seq"

    If the sequence does not exist it is created with current=initial_current and
    padding=padding. The current value is incremented by 1 before returning.

    If the number of digits in the incremented value is less than padding, the result
    is left-padded with zeros to reach that width. Otherwise the raw string is returned.

    A FOR UPDATE lock is acquired on the row to prevent race conditions under concurrent
    inserts.

    Args:
        initial_current (int): Starting value used when creating a new sequence.
        padding (int): Minimum digit width; smaller numbers are zero-padded.
        *args: One or more strings that identify this sequence.

    Returns:
        str: The formatted next sequence value.
    """
    seq_name = frappe.scrub(" ".join(str(a) for a in args)) + "_id_seq"

    result = frappe.db.sql(
        "SELECT `current`, `padding` FROM `tabSequence` WHERE `name` = %s FOR UPDATE",
        (seq_name,),
        as_dict=True,
    )

    if not result:
        doc = frappe.get_doc(
            {
                "doctype": "Sequence",
                "name": seq_name,
                "current": initial_current,
                "padding": padding,
            }
        )
        doc.insert(ignore_permissions=True)
        current = initial_current
        effective_padding = padding
    else:
        current = result[0]["current"]
        effective_padding = result[0]["padding"]

    next_value = current + 1

    frappe.db.sql(
        "UPDATE `tabSequence` SET `current` = %s WHERE `name` = %s",
        (next_value, seq_name),
    )

    formatted = str(next_value)
    if len(formatted) < effective_padding:
        formatted = formatted.zfill(effective_padding)

    return formatted
