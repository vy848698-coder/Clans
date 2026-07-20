/* ============================================================
   CLANS MACHINA — pan-India city list for the calculator's
   location autocomplete. Curated major cities across every
   state/UT (Odisha covered in depth as the home market).
   Free-typed values are still accepted if a city isn't listed.
   Format: { name, state }
   ============================================================ */
window.CITIES_INDIA = [
  // Odisha (home market — covered in depth)
  { name: "Bhubaneswar", state: "Odisha" }, { name: "Cuttack", state: "Odisha" },
  { name: "Rourkela", state: "Odisha" }, { name: "Berhampur", state: "Odisha" },
  { name: "Sambalpur", state: "Odisha" }, { name: "Puri", state: "Odisha" },
  { name: "Balasore", state: "Odisha" }, { name: "Baleswar", state: "Odisha" },
  { name: "Bhadrak", state: "Odisha" }, { name: "Baripada", state: "Odisha" },
  { name: "Jharsuguda", state: "Odisha" }, { name: "Jeypore", state: "Odisha" },
  { name: "Angul", state: "Odisha" }, { name: "Dhenkanal", state: "Odisha" },
  { name: "Jajpur", state: "Odisha" }, { name: "Kendrapara", state: "Odisha" },
  { name: "Jagatsinghpur", state: "Odisha" }, { name: "Paradip", state: "Odisha" },
  { name: "Keonjhar", state: "Odisha" }, { name: "Kendujhar", state: "Odisha" },
  { name: "Rayagada", state: "Odisha" }, { name: "Koraput", state: "Odisha" },
  { name: "Bolangir", state: "Odisha" }, { name: "Bargarh", state: "Odisha" },
  { name: "Nabarangpur", state: "Odisha" }, { name: "Nuapada", state: "Odisha" },
  { name: "Sundargarh", state: "Odisha" }, { name: "Sonepur", state: "Odisha" },
  { name: "Phulbani", state: "Odisha" }, { name: "Malkangiri", state: "Odisha" },
  { name: "Gajapati", state: "Odisha" }, { name: "Nayagarh", state: "Odisha" },
  { name: "Khordha", state: "Odisha" }, { name: "Deogarh", state: "Odisha" },
  { name: "Ganjam", state: "Odisha" }, { name: "Talcher", state: "Odisha" },
  // Andhra Pradesh
  { name: "Visakhapatnam", state: "Andhra Pradesh" }, { name: "Vijayawada", state: "Andhra Pradesh" },
  { name: "Guntur", state: "Andhra Pradesh" }, { name: "Nellore", state: "Andhra Pradesh" },
  { name: "Kurnool", state: "Andhra Pradesh" }, { name: "Rajahmundry", state: "Andhra Pradesh" },
  { name: "Tirupati", state: "Andhra Pradesh" }, { name: "Kakinada", state: "Andhra Pradesh" },
  { name: "Anantapur", state: "Andhra Pradesh" }, { name: "Kadapa", state: "Andhra Pradesh" },
  // Telangana
  { name: "Hyderabad", state: "Telangana" }, { name: "Warangal", state: "Telangana" },
  { name: "Nizamabad", state: "Telangana" }, { name: "Karimnagar", state: "Telangana" },
  { name: "Khammam", state: "Telangana" }, { name: "Secunderabad", state: "Telangana" },
  // Assam
  { name: "Guwahati", state: "Assam" }, { name: "Silchar", state: "Assam" },
  { name: "Dibrugarh", state: "Assam" }, { name: "Jorhat", state: "Assam" },
  { name: "Nagaon", state: "Assam" }, { name: "Tinsukia", state: "Assam" },
  // Bihar
  { name: "Patna", state: "Bihar" }, { name: "Gaya", state: "Bihar" },
  { name: "Bhagalpur", state: "Bihar" }, { name: "Muzaffarpur", state: "Bihar" },
  { name: "Darbhanga", state: "Bihar" }, { name: "Purnia", state: "Bihar" },
  { name: "Ara", state: "Bihar" }, { name: "Begusarai", state: "Bihar" },
  // Chhattisgarh
  { name: "Raipur", state: "Chhattisgarh" }, { name: "Bhilai", state: "Chhattisgarh" },
  { name: "Bilaspur", state: "Chhattisgarh" }, { name: "Korba", state: "Chhattisgarh" },
  { name: "Durg", state: "Chhattisgarh" }, { name: "Raigarh", state: "Chhattisgarh" },
  // Delhi NCR
  { name: "New Delhi", state: "Delhi" }, { name: "Delhi", state: "Delhi" },
  { name: "Gurugram", state: "Haryana" }, { name: "Noida", state: "Uttar Pradesh" },
  { name: "Ghaziabad", state: "Uttar Pradesh" }, { name: "Faridabad", state: "Haryana" },
  // Goa
  { name: "Panaji", state: "Goa" }, { name: "Margao", state: "Goa" },
  { name: "Vasco da Gama", state: "Goa" }, { name: "Mapusa", state: "Goa" },
  // Gujarat
  { name: "Ahmedabad", state: "Gujarat" }, { name: "Surat", state: "Gujarat" },
  { name: "Vadodara", state: "Gujarat" }, { name: "Rajkot", state: "Gujarat" },
  { name: "Bhavnagar", state: "Gujarat" }, { name: "Jamnagar", state: "Gujarat" },
  { name: "Gandhinagar", state: "Gujarat" }, { name: "Junagadh", state: "Gujarat" },
  { name: "Anand", state: "Gujarat" }, { name: "Nadiad", state: "Gujarat" },
  // Haryana
  { name: "Panipat", state: "Haryana" }, { name: "Ambala", state: "Haryana" },
  { name: "Karnal", state: "Haryana" }, { name: "Hisar", state: "Haryana" },
  { name: "Rohtak", state: "Haryana" }, { name: "Panchkula", state: "Haryana" },
  // Himachal Pradesh
  { name: "Shimla", state: "Himachal Pradesh" }, { name: "Solan", state: "Himachal Pradesh" },
  { name: "Dharamshala", state: "Himachal Pradesh" }, { name: "Mandi", state: "Himachal Pradesh" },
  // Jharkhand
  { name: "Ranchi", state: "Jharkhand" }, { name: "Jamshedpur", state: "Jharkhand" },
  { name: "Dhanbad", state: "Jharkhand" }, { name: "Bokaro", state: "Jharkhand" },
  { name: "Hazaribagh", state: "Jharkhand" }, { name: "Deoghar", state: "Jharkhand" },
  // Karnataka
  { name: "Bengaluru", state: "Karnataka" }, { name: "Mysuru", state: "Karnataka" },
  { name: "Hubli", state: "Karnataka" }, { name: "Mangaluru", state: "Karnataka" },
  { name: "Belagavi", state: "Karnataka" }, { name: "Kalaburagi", state: "Karnataka" },
  { name: "Davanagere", state: "Karnataka" }, { name: "Ballari", state: "Karnataka" },
  { name: "Shivamogga", state: "Karnataka" }, { name: "Tumakuru", state: "Karnataka" },
  // Kerala
  { name: "Thiruvananthapuram", state: "Kerala" }, { name: "Kochi", state: "Kerala" },
  { name: "Kozhikode", state: "Kerala" }, { name: "Thrissur", state: "Kerala" },
  { name: "Kollam", state: "Kerala" }, { name: "Kannur", state: "Kerala" },
  { name: "Alappuzha", state: "Kerala" }, { name: "Palakkad", state: "Kerala" },
  // Madhya Pradesh
  { name: "Indore", state: "Madhya Pradesh" }, { name: "Bhopal", state: "Madhya Pradesh" },
  { name: "Jabalpur", state: "Madhya Pradesh" }, { name: "Gwalior", state: "Madhya Pradesh" },
  { name: "Ujjain", state: "Madhya Pradesh" }, { name: "Sagar", state: "Madhya Pradesh" },
  { name: "Rewa", state: "Madhya Pradesh" }, { name: "Satna", state: "Madhya Pradesh" },
  // Maharashtra
  { name: "Mumbai", state: "Maharashtra" }, { name: "Pune", state: "Maharashtra" },
  { name: "Nagpur", state: "Maharashtra" }, { name: "Nashik", state: "Maharashtra" },
  { name: "Aurangabad", state: "Maharashtra" }, { name: "Solapur", state: "Maharashtra" },
  { name: "Thane", state: "Maharashtra" }, { name: "Navi Mumbai", state: "Maharashtra" },
  { name: "Kolhapur", state: "Maharashtra" }, { name: "Amravati", state: "Maharashtra" },
  { name: "Nanded", state: "Maharashtra" }, { name: "Sangli", state: "Maharashtra" },
  // North-East (other)
  { name: "Imphal", state: "Manipur" }, { name: "Shillong", state: "Meghalaya" },
  { name: "Aizawl", state: "Mizoram" }, { name: "Kohima", state: "Nagaland" },
  { name: "Agartala", state: "Tripura" }, { name: "Itanagar", state: "Arunachal Pradesh" },
  { name: "Gangtok", state: "Sikkim" },
  // Punjab
  { name: "Ludhiana", state: "Punjab" }, { name: "Amritsar", state: "Punjab" },
  { name: "Jalandhar", state: "Punjab" }, { name: "Patiala", state: "Punjab" },
  { name: "Bathinda", state: "Punjab" }, { name: "Mohali", state: "Punjab" },
  { name: "Chandigarh", state: "Chandigarh" },
  // Rajasthan
  { name: "Jaipur", state: "Rajasthan" }, { name: "Jodhpur", state: "Rajasthan" },
  { name: "Udaipur", state: "Rajasthan" }, { name: "Kota", state: "Rajasthan" },
  { name: "Ajmer", state: "Rajasthan" }, { name: "Bikaner", state: "Rajasthan" },
  { name: "Bhilwara", state: "Rajasthan" }, { name: "Alwar", state: "Rajasthan" },
  { name: "Sikar", state: "Rajasthan" },
  // Tamil Nadu
  { name: "Chennai", state: "Tamil Nadu" }, { name: "Coimbatore", state: "Tamil Nadu" },
  { name: "Madurai", state: "Tamil Nadu" }, { name: "Tiruchirappalli", state: "Tamil Nadu" },
  { name: "Salem", state: "Tamil Nadu" }, { name: "Tirunelveli", state: "Tamil Nadu" },
  { name: "Tiruppur", state: "Tamil Nadu" }, { name: "Erode", state: "Tamil Nadu" },
  { name: "Vellore", state: "Tamil Nadu" }, { name: "Thoothukudi", state: "Tamil Nadu" },
  // Uttar Pradesh
  { name: "Lucknow", state: "Uttar Pradesh" }, { name: "Kanpur", state: "Uttar Pradesh" },
  { name: "Agra", state: "Uttar Pradesh" }, { name: "Varanasi", state: "Uttar Pradesh" },
  { name: "Prayagraj", state: "Uttar Pradesh" }, { name: "Meerut", state: "Uttar Pradesh" },
  { name: "Bareilly", state: "Uttar Pradesh" }, { name: "Aligarh", state: "Uttar Pradesh" },
  { name: "Moradabad", state: "Uttar Pradesh" }, { name: "Gorakhpur", state: "Uttar Pradesh" },
  { name: "Jhansi", state: "Uttar Pradesh" }, { name: "Ayodhya", state: "Uttar Pradesh" },
  // Uttarakhand
  { name: "Dehradun", state: "Uttarakhand" }, { name: "Haridwar", state: "Uttarakhand" },
  { name: "Roorkee", state: "Uttarakhand" }, { name: "Haldwani", state: "Uttarakhand" },
  { name: "Rishikesh", state: "Uttarakhand" }, { name: "Nainital", state: "Uttarakhand" },
  // West Bengal
  { name: "Kolkata", state: "West Bengal" }, { name: "Howrah", state: "West Bengal" },
  { name: "Durgapur", state: "West Bengal" }, { name: "Asansol", state: "West Bengal" },
  { name: "Siliguri", state: "West Bengal" }, { name: "Bardhaman", state: "West Bengal" },
  { name: "Malda", state: "West Bengal" }, { name: "Kharagpur", state: "West Bengal" },
  // UTs
  { name: "Jammu", state: "Jammu & Kashmir" }, { name: "Srinagar", state: "Jammu & Kashmir" },
  { name: "Leh", state: "Ladakh" }, { name: "Port Blair", state: "Andaman & Nicobar" },
  { name: "Puducherry", state: "Puducherry" }, { name: "Silvassa", state: "Dadra & Nagar Haveli" },
  { name: "Kavaratti", state: "Lakshadweep" }
];
