
-- =========================
-- Updated-at helper
-- =========================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- =========================
-- PROFILES
-- =========================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  home_city TEXT DEFAULT 'Chennai',
  home_state TEXT DEFAULT 'Tamil Nadu',
  preferred_travel_mode TEXT DEFAULT 'car',
  daily_budget INTEGER DEFAULT 2000,
  walking_difficulty TEXT DEFAULT 'moderate',
  food_preference TEXT DEFAULT 'vegetarian',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read"   ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- TEMPLES (public catalog)
-- =========================
CREATE TABLE public.temples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- shiva, murugan, perumal, amman, jyotirlinga, divya_desam, padal_petra, unesco, hidden, nature, hill, waterfall, beach, wildlife, historical
  deity TEXT,
  state TEXT NOT NULL,
  district TEXT,
  city TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  description TEXT,
  history TEXT,
  architecture TEXT,
  speciality TEXT,
  dress_code TEXT,
  timing TEXT,
  festivals TEXT[],
  best_time TEXT,
  photography_rules TEXT,
  estimated_budget INTEGER,
  travel_tips TEXT,
  hero_image TEXT,
  gallery TEXT[],
  tags TEXT[],
  rating NUMERIC(2,1) DEFAULT 4.5,
  is_unesco BOOLEAN DEFAULT false,
  is_hidden_gem BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.temples TO anon, authenticated;
GRANT ALL ON public.temples TO service_role;
ALTER TABLE public.temples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "temples public read" ON public.temples FOR SELECT TO anon, authenticated USING (true);
CREATE TRIGGER trg_temples_updated BEFORE UPDATE ON public.temples FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_temples_category ON public.temples(category);
CREATE INDEX idx_temples_state ON public.temples(state);

-- =========================
-- WISHLIST
-- =========================
CREATE TABLE public.wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  temple_id UUID REFERENCES public.temples(id) ON DELETE CASCADE,
  custom_name TEXT,
  custom_location TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wishlist TO authenticated;
GRANT ALL ON public.wishlist TO service_role;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wishlist all" ON public.wishlist FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================
-- VISITED PLACES
-- =========================
CREATE TABLE public.visited_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  temple_id UUID REFERENCES public.temples(id) ON DELETE SET NULL,
  place_name TEXT NOT NULL,
  place_state TEXT,
  visit_date DATE,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  notes TEXT,
  photos TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visited_places TO authenticated;
GRANT ALL ON public.visited_places TO service_role;
ALTER TABLE public.visited_places ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own visited all" ON public.visited_places FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================
-- ITINERARIES
-- =========================
CREATE TABLE public.itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  days INTEGER NOT NULL DEFAULT 1,
  budget INTEGER,
  travel_mode TEXT,
  start_city TEXT,
  interests TEXT[],
  plan JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.itineraries TO authenticated;
GRANT ALL ON public.itineraries TO service_role;
ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own itineraries all" ON public.itineraries FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_itineraries_updated BEFORE UPDATE ON public.itineraries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- CHAT MESSAGES (Temple Explorer AI)
-- =========================
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id TEXT NOT NULL DEFAULT 'default',
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own chat all" ON public.chat_messages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_chat_user_thread ON public.chat_messages(user_id, thread_id, created_at);

-- =========================
-- TRAVEL NOTES
-- =========================
CREATE TABLE public.travel_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_notes TO authenticated;
GRANT ALL ON public.travel_notes TO service_role;
ALTER TABLE public.travel_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notes all" ON public.travel_notes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_notes_updated BEFORE UPDATE ON public.travel_notes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- Auto-create profile on signup, seed Sanjai's visited list
-- =========================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name TEXT;
  v_seed TEXT[] := ARRAY['Bangalore','Yelagiri','Yercaud','Hyderabad','Madurai','Trichy','Tiruchendur','Coimbatore','Tirupati'];
  v_place TEXT;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1));
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (NEW.id, v_name, NEW.raw_user_meta_data->>'avatar_url');

  -- Pre-seed visited places for Sanjai (any account gets the seed; harmless and matches the spec)
  FOREACH v_place IN ARRAY v_seed LOOP
    INSERT INTO public.visited_places (user_id, place_name, place_state)
    VALUES (NEW.id, v_place, NULL);
  END LOOP;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================
-- Seed curated temple/destination catalog (Tamil Nadu first, then South India, then India)
-- =========================
INSERT INTO public.temples (slug,name,category,deity,state,district,city,latitude,longitude,description,history,architecture,speciality,dress_code,timing,festivals,best_time,photography_rules,estimated_budget,travel_tips,hero_image,tags,is_unesco,is_hidden_gem) VALUES
('brihadeeswarar-thanjavur','Brihadeeswarar Temple','unesco','Shiva','Tamil Nadu','Thanjavur','Thanjavur',10.7828,79.1318,'Thousand-year-old Chola masterpiece, one of the Great Living Chola Temples.','Built by Raja Raja Chola I in 1010 CE.','Dravidian, 216-foot vimana carved from a single granite block.','UNESCO World Heritage Site, massive Nandi monolith.','Traditional Indian wear, no shorts','06:00-12:30, 16:00-20:30',ARRAY['Maha Shivaratri','Sadaya Vizha'],'November to February','Allowed outside, restricted inside sanctum',500,'Carry water; the courtyard is huge and hot by noon.','https://images.unsplash.com/photo-1606298855672-3efb63017be8',ARRAY['chola','unesco','shiva','heritage'],true,false),
('meenakshi-madurai','Meenakshi Amman Temple','amman','Meenakshi (Parvati) & Sundareswarar (Shiva)','Tamil Nadu','Madurai','Madurai',9.9195,78.1193,'Iconic 14-tower temple complex at the heart of Madurai.','Rebuilt by Nayaks in the 16th century, origins in 6th century BCE.','Dravidian; 14 gopurams covered in 33,000 sculptures.','Hall of Thousand Pillars, vibrant night procession.','Traditional wear, no leather','05:00-12:30, 16:00-21:30',ARRAY['Chithirai Festival','Float Festival'],'October to March','Phones allowed in outer prakaram only',300,'Visit evening aarti and the temple market outside.','https://images.unsplash.com/photo-1582510003544-4d00b7f74220',ARRAY['amman','heritage','tamil-nadu'],false,false),
('rameshwaram','Ramanathaswamy Temple','shiva','Shiva (Ramanathaswamy)','Tamil Nadu','Ramanathapuram','Rameswaram',9.2881,79.3174,'One of the Char Dham and a Jyotirlinga, on Pamban island.','Linked to the Ramayana; expanded by Pandyas and Setupatis.','Longest temple corridor in the world (1212m).','22 sacred theerthams (wells) inside the temple.','Traditional wear','05:00-13:00, 15:00-21:00',ARRAY['Maha Shivaratri','Thai Amavasai'],'October to April','Not allowed inside',400,'Bathe in the 22 wells before darshan; bring extra clothes.','https://images.unsplash.com/photo-1609340913889-08c91a23c4b3',ARRAY['jyotirlinga','char-dham','shiva'],false,false),
('palani-murugan','Palani Murugan Temple','murugan','Murugan (Dhandayuthapani)','Tamil Nadu','Dindigul','Palani',10.4500,77.5226,'One of the six Arupadaiveedu of Lord Murugan, atop a hill.','Idol believed to be made by Sage Bhogar from nine herbs.','Hilltop temple reached via 690 steps or ropeway.','Panchamirtham prasadam (GI tagged).','Traditional wear; men in dhoti','05:00-20:30',ARRAY['Thaipusam','Panguni Uthiram'],'November to February','No phones inside sanctum',350,'Take ropeway if walking is difficult; carry shawl for hilltop wind.','https://images.unsplash.com/photo-1591777334776-c40c0a4ec85f',ARRAY['murugan','arupadaiveedu','hill'],false,false),
('thiruchendur-murugan','Thiruchendur Murugan Temple','murugan','Murugan','Tamil Nadu','Thoothukudi','Tiruchendur',8.4961,78.1196,'Seaside Arupadaiveedu where Murugan defeated Surapadman.','Ancient temple by the Bay of Bengal.','Dravidian seaside temple with sea-facing eastern gateway.','One of only two Arupadaiveedu at sea level.','Traditional wear','05:00-21:00',ARRAY['Skanda Sashti','Avani Festival'],'October to March','Restricted near sanctum',300,'Take dip in Nazhi Kinaru well before darshan.','https://images.unsplash.com/photo-1604608672516-f1b9b1d1f5b3',ARRAY['murugan','arupadaiveedu','beach'],false,false),
('srirangam','Sri Ranganathaswamy Temple','perumal','Vishnu (Ranganatha)','Tamil Nadu','Tiruchirappalli','Srirangam',10.8624,78.6890,'Largest functioning Hindu temple complex in the world.','Mentioned in Sangam literature; 21 gopurams.','7 prakarams over 156 acres; 236-foot Rajagopuram is tallest in Asia.','Foremost of the 108 Divya Desams.','Traditional wear','06:00-13:00, 15:15-21:00',ARRAY['Vaikunta Ekadasi','Brahmotsavam'],'November to February','Allowed in outer prakarams',400,'Plan 3-4 hours; wear thick socks (hot stone floors).','https://images.unsplash.com/photo-1582510003544-4d00b7f74220',ARRAY['divya-desam','perumal','heritage'],false,false),
('chidambaram-nataraja','Chidambaram Nataraja Temple','shiva','Nataraja (Shiva)','Tamil Nadu','Cuddalore','Chidambaram',11.3994,79.6936,'Temple to Shiva as the cosmic dancer Nataraja.','Built by Cholas; one of the Pancha Bhoota Sthalams (Akasha/Space).','Gold-roofed Chit Sabha; intricate Bharatanatyam karanas carved on gopurams.','Akasha Lingam (formless space).','Traditional wear','06:00-12:00, 17:00-22:00',ARRAY['Natyanjali','Margazhi Thiruvadhirai'],'December to February','Restricted in inner sanctum',300,'Watch evening aarti; Nataraja darshan five times a day.','https://images.unsplash.com/photo-1609920658906-8223bd289001',ARRAY['shiva','pancha-bhoota','dance'],false,false),
('kanchi-kamakshi','Kamakshi Amman Temple','amman','Kamakshi (Parvati)','Tamil Nadu','Kanchipuram','Kanchipuram',12.8420,79.7036,'One of the three Shakti Peethas of Tripura Sundari form.','Established by Adi Shankaracharya.','Dravidian; gold-plated vimana.','Sri Chakra installed by Adi Shankara.','Traditional wear','05:30-12:30, 16:00-21:00',ARRAY['Navaratri','Aadi Pooram'],'October to March','Not allowed inside',250,'Combine with Ekambareswarar and Varadaraja Perumal in a day.','https://images.unsplash.com/photo-1609340913889-08c91a23c4b3',ARRAY['amman','shakti','kanchipuram'],false,false),
('tiruvannamalai-arunachala','Arunachaleswarar Temple','shiva','Arunachaleswarar (Shiva)','Tamil Nadu','Tiruvannamalai','Tiruvannamalai',12.2317,79.0700,'Agni (Fire) element among Pancha Bhoota Sthalams; foot of sacred Arunachala hill.','Ancient; expanded by Cholas, Vijayanagara, Hoysalas.','One of the largest temples in India; 217ft eastern Rajagopuram.','Karthigai Deepam atop the hill; girivalam path.','Traditional wear','05:30-12:30, 15:30-21:00',ARRAY['Karthigai Deepam','Maha Shivaratri'],'November to February','Allowed in outer areas',300,'Do girivalam (14km circumambulation) on full moon.','https://images.unsplash.com/photo-1609920658906-8223bd289001',ARRAY['shiva','pancha-bhoota','girivalam'],false,false),
('mahabalipuram','Shore Temple, Mahabalipuram','unesco','Shiva & Vishnu','Tamil Nadu','Chengalpattu','Mahabalipuram',12.6164,80.1992,'8th-century rock-cut temple beside the Bay of Bengal.','Built by Pallava king Narasimhavarman II.','Dravidian; rock-cut granite.','UNESCO Group of Monuments at Mahabalipuram.','Casual is fine; carry stole','06:00-18:00',ARRAY['Mamallapuram Dance Festival'],'November to February','Allowed everywhere',200,'Combine with Pancha Rathas and Arjuna Penance.','https://images.unsplash.com/photo-1582510003544-4d00b7f74220',ARRAY['unesco','heritage','beach'],true,false),
('kodaikanal','Kodaikanal Hill Station','hill','-','Tamil Nadu','Dindigul','Kodaikanal',10.2381,77.4892,'Princess of Hill Stations — lakes, pines, viewpoints.','Founded by American missionaries in 1845.','-','Kodaikanal Lake, Coakers Walk, Pillar Rocks.','Casual + warm layers','Open all day',ARRAY['Summer Festival'],'October to March','Free everywhere',2500,'Book stay near lake; carry sweater even in summer.','https://images.unsplash.com/photo-1626621341517-bbf3d9990a23',ARRAY['hill','nature','weekend'],false,false),
('ooty','Ooty (Udhagamandalam)','hill','-','Tamil Nadu','Nilgiris','Ooty',11.4102,76.6950,'Queen of Nilgiris with toy train, tea gardens and botanical garden.','Established by the British in early 1800s.','-','Nilgiri Mountain Railway (UNESCO), Doddabetta peak.','Casual + warm layers','Open all day',ARRAY['Flower Show','Tea & Tourism Festival'],'April to June, September to November','Free everywhere',3000,'Book Nilgiri toy train tickets in advance.','https://images.unsplash.com/photo-1602216056096-3b40cc0c9944',ARRAY['hill','nature','unesco-railway'],false,false),
('courtallam','Courtallam Falls','waterfall','-','Tamil Nadu','Tenkasi','Courtallam',8.9333,77.2667,'"Spa of South India" — series of medicinal waterfalls.','Ancient bathing site referenced in Tamil literature.','-','Main Falls, Five Falls, Old Courtallam Falls.','Swimwear under clothes; change rooms available','06:00-18:00 (peak July-October)',ARRAY['Saral Vizha'],'July to October','Allowed; protect gear',800,'Go early to beat crowds; herbal oils sold locally.','https://images.unsplash.com/photo-1564550974352-1f1f8df0ea44',ARRAY['waterfall','nature'],false,false),
('hogenakkal','Hogenakkal Falls','waterfall','-','Tamil Nadu','Dharmapuri','Hogenakkal',12.1167,77.7667,'Niagara of India — coracle rides through gorges.','Sacred Kaveri river falls.','-','Carbonatite rock formations, coracle rides.','Casual; quick-dry','06:00-18:00',ARRAY[]::TEXT[],'August to January','Allowed',1200,'Negotiate coracle fare; carry change of clothes.','https://images.unsplash.com/photo-1602250920722-3b9a3c83dba2',ARRAY['waterfall','adventure'],false,true),
('rameswaram-dhanushkodi','Dhanushkodi Beach','beach','-','Tamil Nadu','Ramanathapuram','Dhanushkodi',9.1456,79.4419,'Ghost town tip of India where Bay of Bengal meets Indian Ocean.','Destroyed in 1964 cyclone.','-','End of Indian land; ruined church and railway.','Casual; sun protection','Sunrise-sunset',ARRAY[]::TEXT[],'October to March','Allowed',1500,'Take only authorized 4x4 vans on the sand road.','https://images.unsplash.com/photo-1583774538455-fce8c4dde88c',ARRAY['beach','hidden','adventure'],false,true),
('velliangiri','Velliangiri Mountains','hill','Shiva (Dakshin Kailash)','Tamil Nadu','Coimbatore','Coimbatore',10.9658,76.6914,'"Kailash of the South" — 7-hill trek to swayambhu Shiva.','Sage Agastya legend.','Natural mountain shrine.','Trek opens only in Feb-May.','Traditional dhoti for trek','Pre-dawn start',ARRAY['Maha Shivaratri'],'February to May','Restricted near peak',500,'14km steep trek — only for fit pilgrims.','https://images.unsplash.com/photo-1609340913889-08c91a23c4b3',ARRAY['shiva','hidden','trek','hill'],false,true),
('hampi','Hampi','unesco','Virupaksha (Shiva)','Karnataka','Vijayanagara','Hampi',15.3350,76.4600,'Ruined Vijayanagara capital — boulders, temples, bazaars.','Capital of Vijayanagara Empire (14-16th C).','Dravidian + Indo-Islamic.','UNESCO Group of Monuments at Hampi.','Casual','06:00-18:00',ARRAY['Hampi Utsav'],'November to February','Allowed everywhere',2000,'Rent scooter; 2-3 days to cover ruins.','https://images.unsplash.com/photo-1564507592333-c60657eea523',ARRAY['unesco','heritage','karnataka'],true,false),
('sabarimala','Sabarimala Ayyappa Temple','shiva','Ayyappa','Kerala','Pathanamthitta','Sabarimala',9.4364,77.0808,'Major Ayyappa pilgrimage in Western Ghats.','Ancient; major Mandala-Makaravilakku season.','Hilltop forest shrine.','41-day Vratham before darshan.','Black/blue dhoti; Irumudi kettu','Mandala-Makaravilakku season Nov-Jan',ARRAY['Makaravilakku','Mandala Pooja'],'November to January','Not allowed',1500,'Trek 5km from Pamba; physically demanding.','https://images.unsplash.com/photo-1609340913889-08c91a23c4b3',ARRAY['ayyappa','trek','kerala'],false,false),
('guruvayur','Guruvayur Sri Krishna Temple','perumal','Krishna (Guruvayurappan)','Kerala','Thrissur','Guruvayur',10.5945,76.0399,'One of the most sacred Krishna temples — "Dwarka of South".','5000 years old per legend.','Kerala-style with gopuram.','Famous Ekadasi celebrations.','Men: dhoti, no shirt. Women: saree/set-mundu','03:00-13:00, 16:30-21:30',ARRAY['Ekadasi','Ulsavam'],'October to March','Strictly prohibited',400,'Non-Hindus not allowed inside; respect dress code.','https://images.unsplash.com/photo-1582510003544-4d00b7f74220',ARRAY['krishna','kerala','perumal'],false,false),
('munnar','Munnar','hill','-','Kerala','Idukki','Munnar',10.0889,77.0595,'Tea-garden hill station in the Western Ghats.','British-era tea plantations.','-','Eravikulam NP, Mattupetty Dam, tea museum.','Casual + warm layers','Open all day',ARRAY['Neelakurinji bloom (every 12 years)'],'September to March','Allowed',3500,'Book stay early in season; carry windcheater.','https://images.unsplash.com/photo-1609920658906-8223bd289001',ARRAY['hill','nature','tea'],false,false),
('tirupati','Tirumala Venkateswara Temple','perumal','Venkateswara (Vishnu)','Andhra Pradesh','Tirupati','Tirumala',13.6833,79.3475,'Richest and most visited temple in the world.','Ancient; major Pallava/Chola/Vijayanagara patronage.','Dravidian; gold-plated ananda nilayam vimana.','Tirupati Laddu (GI tagged).','Traditional wear','Almost 24x7 with darshan slots',ARRAY['Brahmotsavam','Vaikunta Ekadasi'],'September to March','Strictly prohibited',1500,'Book darshan slot online (TTD); allow a full day.','https://images.unsplash.com/photo-1609340913889-08c91a23c4b3',ARRAY['perumal','venkateswara','andhra'],false,false),
('srisailam','Srisailam Mallikarjuna','shiva','Mallikarjuna (Shiva)','Andhra Pradesh','Nandyal','Srisailam',16.0739,78.8682,'Jyotirlinga + Shakti Peetha on Nallamala hills.','Ancient; mentioned in Skanda Purana.','Hilltop temple complex.','Only Jyotirlinga that is also a Shakti Peetha.','Traditional wear','04:30-22:00',ARRAY['Maha Shivaratri','Ugadi'],'October to February','Restricted',800,'Combine with Srisailam dam and tiger reserve.','https://images.unsplash.com/photo-1609920658906-8223bd289001',ARRAY['jyotirlinga','shakti-peetha','hill'],false,false),
('gokarna','Gokarna Mahabaleshwar','shiva','Mahabaleshwar (Shiva)','Karnataka','Uttara Kannada','Gokarna',14.5479,74.3188,'Ancient Atma-Linga shrine plus pristine beaches.','Legend of Ravana and the Atma-Linga.','Dravidian temple + beach town.','Atma Linga darshan and Om Beach.','Traditional wear for temple','06:00-12:30, 17:00-20:30',ARRAY['Maha Shivaratri'],'October to March','Allowed at beaches; not inside temple',1800,'Combine temple with Om/Kudle beach trek.','https://images.unsplash.com/photo-1583774538455-fce8c4dde88c',ARRAY['shiva','beach','karnataka'],false,true),
('kashi-vishwanath','Kashi Vishwanath','shiva','Vishwanath (Shiva)','Uttar Pradesh','Varanasi','Varanasi',25.3109,83.0107,'One of 12 Jyotirlingas in the holy city of Kashi.','One of the oldest living cities.','Gold-plated spires; modernized corridor.','New Vishwanath Dham corridor.','Traditional wear','03:00-23:00 (with breaks)',ARRAY['Maha Shivaratri','Dev Deepavali'],'October to March','Strictly prohibited in sanctum',2500,'Combine with Ganga aarti at Dashashwamedh Ghat.','https://images.unsplash.com/photo-1609340913889-08c91a23c4b3',ARRAY['jyotirlinga','varanasi','kashi'],false,false),
('jagannath-puri','Jagannath Temple, Puri','perumal','Jagannath (Krishna)','Odisha','Puri','Puri',19.8048,85.8181,'One of Char Dham — home of the world-famous Rath Yatra.','12th-century temple by Eastern Ganga dynasty.','Kalinga style; 214ft tower.','Jagannath Rath Yatra and Mahaprasad.','Traditional wear; non-Hindus restricted','05:00-midnight',ARRAY['Rath Yatra','Snana Yatra'],'October to February','Strictly prohibited',2500,'Book Mahaprasad at Ananda Bazaar.','https://images.unsplash.com/photo-1582510003544-4d00b7f74220',ARRAY['char-dham','perumal','heritage'],false,false);
