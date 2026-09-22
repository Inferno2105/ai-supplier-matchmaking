"""
Fixed category dropdown — used by both Client and Supplier forms.
Deliberately fixed (not free text) so matching can filter by exact category
without fuzzy-matching label variants like "Steel Pipes" vs "Industrial Piping".
"""

CATEGORIES = [
    "Electronics & Components",
    "Raw Materials & Metals",
    "Textiles & Apparel",
    "Machinery & Equipment",
    "Packaging & Containers",
    "Chemicals & Plastics",
    "Food & Beverage",
    "Construction Materials",
    "Automotive Parts",
    "Furniture & Woodwork",
    "Pharmaceuticals & Medical Supplies",
    "IT Hardware & Software",
    "Agricultural Products",
    "Office Supplies",
    "Other",
]
