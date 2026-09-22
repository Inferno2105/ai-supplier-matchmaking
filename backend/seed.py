"""
Seeds the database with realistic demo data: a handful of client
requirements and supplier offerings across a few categories, so the
matching engine has something to work with immediately after setup.

Run against a REAL MongoDB instance (not the sandbox mock):
    python seed.py

Safe to re-run — it clears existing demo users/data with these exact
emails first, rather than accumulating duplicates.
"""

import asyncio
from app.core.database import users, client_profiles, supplier_profiles, matches, notifications
from app.core.security import hash_password
from app.models.user import UserInDB, Role
from app.models.client import ClientInDB
from app.models.supplier import SupplierInDB
from app.services.matching import run_matching_for_client

DEMO_PASSWORD = "demo12345"

CLIENTS = [
    dict(
        email="acme.manufacturing@demo.com",
        company_name="Acme Manufacturing",
        product_requirement="High-grade stainless steel pipes for industrial plumbing, corrosion resistant, food-safe grade",
        category="Raw Materials & Metals",
        quantity_required=1000, budget_min=50000, budget_max=80000,
        state="Maharashtra", city="Mumbai", delivery_days_needed=20,
        notes="Prefer ISO 9001 certified supplier",
    ),
    dict(
        email="techspark.electronics@demo.com",
        company_name="TechSpark Electronics",
        product_requirement="Bulk order of microcontroller boards and sensor modules for IoT devices",
        category="Electronics & Components",
        quantity_required=5000, budget_min=200000, budget_max=350000,
        state="Karnataka", city="Bengaluru", delivery_days_needed=30,
        notes="Need RoHS compliance documentation",
    ),
    dict(
        email="greenfield.foods@demo.com",
        company_name="Greenfield Foods",
        product_requirement="Food-grade packaging containers, recyclable, for ready-to-eat meals",
        category="Packaging & Containers",
        quantity_required=20000, budget_min=100000, budget_max=150000,
        state="Delhi", city="New Delhi", delivery_days_needed=15,
        notes="",
    ),
    dict(
        email="vogue.textiles@demo.com",
        company_name="Vogue Textiles",
        product_requirement="Cotton fabric rolls for garment manufacturing, 200 GSM, pre-shrunk",
        category="Textiles & Apparel",
        quantity_required=8000, budget_min=300000, budget_max=450000,
        state="Tamil Nadu", city="Coimbatore", delivery_days_needed=25,
        notes="Sample swatch needed before bulk order",
    ),
    dict(
        email="buildright.constructions@demo.com",
        company_name="BuildRight Constructions",
        product_requirement="CNC machining equipment for precision metal component fabrication",
        category="Machinery & Equipment",
        quantity_required=5, budget_min=1500000, budget_max=2200000,
        state="Gujarat", city="Ahmedabad", delivery_days_needed=45,
        notes="On-site installation and training required",
    ),
    dict(
        email="purechem.labs@demo.com",
        company_name="PureChem Labs",
        product_requirement="Industrial-grade plastic granules for injection molding, high purity",
        category="Chemicals & Plastics",
        quantity_required=10000, budget_min=400000, budget_max=550000,
        state="Maharashtra", city="Pune", delivery_days_needed=20,
        notes="Requires MSDS documentation",
    ),
    dict(
        email="drivetech.motors@demo.com",
        company_name="DriveTech Motors",
        product_requirement="Automotive brake pads and clutch plates for passenger vehicles",
        category="Automotive Parts",
        quantity_required=3000, budget_min=180000, budget_max=250000,
        state="Tamil Nadu", city="Chennai", delivery_days_needed=18,
        notes="OEM-grade quality preferred",
    ),
    dict(
        email="medicare.pharma@demo.com",
        company_name="MediCare Pharma",
        product_requirement="Disposable surgical gloves and PPE kits, medical grade, sterile packaging",
        category="Pharmaceuticals & Medical Supplies",
        quantity_required=50000, budget_min=250000, budget_max=350000,
        state="Telangana", city="Hyderabad", delivery_days_needed=12,
        notes="FDA/CE certification mandatory",
    ),
    dict(
        email="greenharvest.co@demo.com",
        company_name="GreenHarvest Co",
        product_requirement="Bulk organic wheat and rice grain for regional food distribution",
        category="Agricultural Products",
        quantity_required=15000, budget_min=80000, budget_max=120000,
        state="Punjab", city="Ludhiana", delivery_days_needed=20,
        notes="No supplier onboarded in this category yet — intended to show an empty-matches state",
    ),
]

SUPPLIERS = [
    dict(
        email="steelco.industries@demo.com",
        supplier_name="SteelCo Industries",
        product_offered="Industrial stainless steel piping, corrosion resistant, ISO 9001 certified, food-safe options available",
        category="Raw Materials & Metals",
        available_quantity=1200, price_min=55000, price_max=75000,
        state="Maharashtra", city="Mumbai", delivery_days_capable=15,
        notes="Bulk discounts available for orders over 1000 units",
    ),
    dict(
        email="farsupply.co@demo.com",
        supplier_name="Far Supply Co",
        product_offered="Plastic garden hoses for home and agricultural use",
        category="Raw Materials & Metals",
        available_quantity=200, price_min=90000, price_max=120000,
        state="West Bengal", city="Kolkata", delivery_days_capable=45,
        notes="",
    ),
    dict(
        email="circuitworks@demo.com",
        supplier_name="CircuitWorks Pvt Ltd",
        product_offered="Microcontroller boards, sensor modules, and IoT development kits, RoHS compliant",
        category="Electronics & Components",
        available_quantity=6000, price_min=220000, price_max=330000,
        state="Karnataka", city="Bengaluru", delivery_days_capable=20,
        notes="Full compliance documentation provided with every order",
    ),
    dict(
        email="ecopack.solutions@demo.com",
        supplier_name="EcoPack Solutions",
        product_offered="Recyclable food-grade packaging containers for meal delivery and takeaway",
        category="Packaging & Containers",
        available_quantity=25000, price_min=95000, price_max=140000,
        state="Delhi", city="New Delhi", delivery_days_capable=10,
        notes="Biodegradable options also available",
    ),
    dict(
        email="cottonmill.traders@demo.com",
        supplier_name="CottonMill Traders",
        product_offered="Cotton fabric rolls, 200 GSM, pre-shrunk, suitable for garment manufacturing",
        category="Textiles & Apparel",
        available_quantity=9000, price_min=310000, price_max=430000,
        state="Tamil Nadu", city="Coimbatore", delivery_days_capable=18,
        notes="Free swatch samples available on request",
    ),
    dict(
        email="silkroute.exports@demo.com",
        supplier_name="Silk Route Exports",
        product_offered="Premium handwoven silk sarees and yardage for boutique retail",
        category="Textiles & Apparel",
        available_quantity=500, price_min=900000, price_max=1200000,
        state="West Bengal", city="Kolkata", delivery_days_capable=40,
        notes="Export-quality, small-batch artisan production",
    ),
    dict(
        email="precisiontech.machines@demo.com",
        supplier_name="PrecisionTech Machines",
        product_offered="CNC machining centers for precision metal component fabrication, with on-site setup",
        category="Machinery & Equipment",
        available_quantity=12, price_min=1600000, price_max=2100000,
        state="Gujarat", city="Ahmedabad", delivery_days_capable=35,
        notes="Includes 1-year on-site warranty and operator training",
    ),
    dict(
        email="polyplast.industries@demo.com",
        supplier_name="PolyPlast Industries",
        product_offered="High-purity industrial plastic granules for injection molding applications",
        category="Chemicals & Plastics",
        available_quantity=4000, price_min=420000, price_max=520000,
        state="Maharashtra", city="Pune", delivery_days_capable=15,
        notes="MSDS provided with every shipment — currently limited stock",
    ),
    dict(
        email="autoparts.hub@demo.com",
        supplier_name="AutoParts Hub",
        product_offered="OEM-grade automotive brake pads, clutch plates, and friction components",
        category="Automotive Parts",
        available_quantity=3500, price_min=190000, price_max=240000,
        state="Tamil Nadu", city="Madurai", delivery_days_capable=14,
        notes="ISO/TS 16949 certified manufacturing",
    ),
    dict(
        email="medsupply.corp@demo.com",
        supplier_name="MedSupply Corp",
        product_offered="Sterile disposable surgical gloves and PPE kits, medical grade, FDA/CE certified",
        category="Pharmaceuticals & Medical Supplies",
        available_quantity=60000, price_min=260000, price_max=340000,
        state="Telangana", city="Hyderabad", delivery_days_capable=9,
        notes="FDA and CE certification documents included",
    ),
    dict(
        email="techgear.solutions@demo.com",
        supplier_name="TechGear Solutions",
        product_offered="Enterprise laptops, servers, and networking hardware for corporate deployment",
        category="IT Hardware & Software",
        available_quantity=2000, price_min=500000, price_max=900000,
        state="Karnataka", city="Bengaluru", delivery_days_capable=20,
        notes="No client requirement posted in this category yet — shows a supplier with zero matches so far",
    ),
]


async def get_or_create_user(email: str, role: Role) -> str:
    existing = await users.find_one({"email": email})
    if existing:
        return str(existing["_id"])
    doc = UserInDB(email=email, password_hash=hash_password(DEMO_PASSWORD), role=role).model_dump()
    result = await users.insert_one(doc)
    return str(result.inserted_id)


async def seed():
    print("Seeding demo data...\n")

    # Clear any previous demo data tied to these exact emails, so re-running is safe.
    demo_emails = [c["email"] for c in CLIENTS] + [s["email"] for s in SUPPLIERS]
    existing_users = users.find({"email": {"$in": demo_emails}})
    existing_ids = [str(u["_id"]) async for u in existing_users]
    if existing_ids:
        await client_profiles.delete_many({"user_id": {"$in": existing_ids}})
        await supplier_profiles.delete_many({"user_id": {"$in": existing_ids}})
        await users.delete_many({"email": {"$in": demo_emails}})
        print(f"Cleared {len(existing_ids)} previous demo user(s) and their data.\n")

    client_ids = []
    for c in CLIENTS:
        user_id = await get_or_create_user(c["email"], Role.client)
        payload = {k: v for k, v in c.items() if k != "email"}
        doc = ClientInDB(user_id=user_id, **payload).model_dump()
        result = await client_profiles.insert_one(doc)
        client_ids.append(str(result.inserted_id))
        print(f"  Client: {c['company_name']} ({c['category']})")

    for s in SUPPLIERS:
        user_id = await get_or_create_user(s["email"], Role.supplier)
        payload = {k: v for k, v in s.items() if k != "email"}
        doc = SupplierInDB(user_id=user_id, **payload).model_dump()
        await supplier_profiles.insert_one(doc)
        print(f"  Supplier: {s['supplier_name']} ({s['category']})")

    print("\nRunning matching engine for all seeded clients...")
    for client_id in client_ids:
        results = await run_matching_for_client(client_id)
        print(f"  {len(results)} match(es) generated for client {client_id}")

    print(f"\nDone. Demo login password for all seeded accounts: {DEMO_PASSWORD}")
    print("Example: acme.manufacturing@demo.com / demo12345 (client)")
    print("Example: steelco.industries@demo.com / demo12345 (supplier)")


if __name__ == "__main__":
    asyncio.run(seed())
