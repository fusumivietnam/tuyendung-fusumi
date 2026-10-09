# Blogger implementation workflow

Runtime changes are applied in Blogger first. Because Blogger Restore/Upload does not reliably round-trip the current theme, XML files in this repository are treated as versioned snapshots and source references rather than guaranteed import packages.

Stable native widgets: Header1, PageList1, Blog1, footer.

Avoid adding new b:section elements until Blogger proves the structure through its own editor/export flow.
