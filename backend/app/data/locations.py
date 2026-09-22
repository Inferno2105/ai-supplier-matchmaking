"""
Static state -> city lookup, used for the location dropdowns and for the
3-tier location score (same city / same state / different state).
Not exhaustive — covers major Indian business hubs, which is enough for a
demo. Easy to extend later without touching any matching logic.
"""

STATE_CITIES = {
    "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Thane"],
    "Delhi": ["New Delhi"],
    "Karnataka": ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli"],
    "Telangana": ["Hyderabad", "Warangal"],
    "West Bengal": ["Kolkata", "Howrah", "Durgapur"],
    "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot"],
    "Uttar Pradesh": ["Lucknow", "Kanpur", "Noida", "Ghaziabad", "Agra"],
    "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur"],
    "Haryana": ["Gurugram", "Faridabad", "Panipat"],
    "Punjab": ["Ludhiana", "Amritsar", "Chandigarh"],
    "Kerala": ["Kochi", "Thiruvananthapuram", "Kozhikode"],
    "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior"],
    "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur"],
    "Bihar": ["Patna", "Gaya"],
    "Odisha": ["Bhubaneswar", "Cuttack"],
    "Assam": ["Guwahati"],
    "Chhattisgarh": ["Raipur"],
    "Jharkhand": ["Ranchi", "Jamshedpur"],
    "Uttarakhand": ["Dehradun"],
}


def all_states():
    return list(STATE_CITIES.keys())


def cities_for_state(state: str):
    return STATE_CITIES.get(state, [])
