-- Migration 011 — catalogue seed (idempotent).
-- Applied through the normal Supabase migration flow (db push / SQL editor / db reset).
-- Guarded so it inserts only when the catalogue is empty; safe to re-run.
-- Rollback: truncate coupons, shipping_zones, product_images, product_variants,
--           products, brands, categories (in FK order).
do $$
begin
  if exists (select 1 from categories) then
    return;
  end if;

  -- ── Categories ─────────────────────────────────────────────────────────────
  insert into categories (name, slug, sort_order, spec_schema) values
    ('Smartphones', 'smartphones', 1, '{"display_in":{"type":"number","facet":true},"chipset":{"type":"string"},"ram_gb":{"type":"number","facet":true},"storage_gb":{"type":"number","facet":true},"battery_mah":{"type":"number"},"rear_cam_mp":{"type":"number"},"os":{"type":"string","facet":true}}'),
    ('Laptops', 'laptops', 2, '{"cpu":{"type":"string","facet":true},"ram_gb":{"type":"number","facet":true},"storage_gb":{"type":"number","facet":true},"display_in":{"type":"number","facet":true},"gpu":{"type":"string"},"os":{"type":"string","facet":true}}'),
    ('Televisions', 'televisions', 3, '{"size_in":{"type":"number","facet":true},"panel":{"type":"string","facet":true},"resolution":{"type":"string","facet":true},"smart_os":{"type":"string"},"hdr":{"type":"boolean"}}'),
    ('Audio', 'audio', 4, '{"type":{"type":"string","facet":true},"connectivity":{"type":"string","facet":true},"anc":{"type":"boolean","facet":true},"battery_hours":{"type":"number"}}'),
    ('Accessories', 'accessories', 5, '{"type":{"type":"string","facet":true},"compatibility":{"type":"string"}}');

  -- ── Brands ─────────────────────────────────────────────────────────────────
  insert into brands (name, slug) values
    ('Apple', 'apple'), ('Samsung', 'samsung'), ('Google', 'google'), ('Tecno', 'tecno'),
    ('Infinix', 'infinix'), ('HP', 'hp'), ('Dell', 'dell'), ('Sony', 'sony');

  -- ── Products ───────────────────────────────────────────────────────────────
  insert into products (category_id, brand_id, title, slug, model, description, condition, warranty_months, warranty_provider, is_active, rating_avg, rating_count, specs)
  select c.id, b.id, v.title, v.slug, v.model, v.description, v.condition::product_cond, v.wm, v.wp, true, v.ravg, v.rc, v.specs::jsonb
  from (values
    ('iPhone 15', 'iphone-15', 'A3090', 'The everyday iPhone with a 48MP camera and USB-C.', 'new', 12, 'Apple Ghana', 4.8, 42, 'apple', '{"display_in":6.1,"chipset":"A16 Bionic","ram_gb":6,"storage_gb":128,"battery_mah":3349,"rear_cam_mp":48,"os":"iOS 17"}'),
    ('iPhone 15 Pro', 'iphone-15-pro', 'A3101', 'Titanium design, A17 Pro, and a pro camera system.', 'new', 12, 'Apple Ghana', 4.9, 30, 'apple', '{"display_in":6.1,"chipset":"A17 Pro","ram_gb":8,"storage_gb":256,"battery_mah":3274,"rear_cam_mp":48,"os":"iOS 17"}'),
    ('Galaxy S24', 'galaxy-s24', 'SM-S921B', 'Compact flagship with Galaxy AI.', 'new', 24, 'Samsung Ghana', 4.7, 51, 'samsung', '{"display_in":6.2,"chipset":"Snapdragon 8 Gen 3","ram_gb":8,"storage_gb":256,"battery_mah":4000,"rear_cam_mp":50,"os":"Android 14"}'),
    ('Galaxy A55', 'galaxy-a55', 'SM-A556B', 'Premium mid-ranger with a metal frame.', 'new', 24, 'Samsung Ghana', 4.5, 88, 'samsung', '{"display_in":6.6,"chipset":"Exynos 1480","ram_gb":8,"storage_gb":128,"battery_mah":5000,"rear_cam_mp":50,"os":"Android 14"}'),
    ('Pixel 8', 'pixel-8', 'GKWS6', 'Google Tensor G3 with 7 years of updates.', 'new', 12, 'Google', 4.6, 24, 'google', '{"display_in":6.2,"chipset":"Tensor G3","ram_gb":8,"storage_gb":128,"battery_mah":4575,"rear_cam_mp":50,"os":"Android 14"}'),
    ('Camon 30', 'camon-30', 'CL6', 'Bright AMOLED and a 50MP selfie camera.', 'new', 12, 'Tecno Care', 4.3, 63, 'tecno', '{"display_in":6.78,"chipset":"Dimensity 7020","ram_gb":8,"storage_gb":256,"battery_mah":5000,"rear_cam_mp":50,"os":"Android 14"}'),
    ('Note 40', 'note-40', 'X6853', 'All-round charging with fast 45W.', 'new', 12, 'Infinix Care', 4.2, 77, 'infinix', '{"display_in":6.78,"chipset":"Helio G99","ram_gb":8,"storage_gb":256,"battery_mah":5000,"rear_cam_mp":108,"os":"Android 14"}'),
    ('Galaxy Z Flip6', 'galaxy-z-flip6', 'SM-F741B', 'Foldable flagship, pocketable design.', 'new', 24, 'Samsung Ghana', 4.6, 19, 'samsung', '{"display_in":6.7,"chipset":"Snapdragon 8 Gen 3","ram_gb":12,"storage_gb":256,"battery_mah":4000,"rear_cam_mp":50,"os":"Android 14"}'),
    ('MacBook Air 13 (M3)', 'macbook-air-13-m3', 'MRXV3', 'Fanless, all-day battery, M3 speed.', 'new', 12, 'Apple Ghana', 4.9, 35, 'apple', '{"cpu":"Apple M3","ram_gb":8,"storage_gb":256,"display_in":13.6,"gpu":"8-core GPU","os":"macOS Sonoma"}'),
    ('MacBook Pro 14 (M3)', 'macbook-pro-14-m3', 'MTL73', 'Pro performance with a Liquid Retina XDR display.', 'new', 12, 'Apple Ghana', 4.9, 21, 'apple', '{"cpu":"Apple M3","ram_gb":16,"storage_gb":512,"display_in":14.2,"gpu":"10-core GPU","os":"macOS Sonoma"}'),
    ('Pavilion 15', 'hp-pavilion-15', '15-eg3', 'Reliable everyday laptop for work and study.', 'new', 12, 'HP Ghana', 4.3, 44, 'hp', '{"cpu":"Intel Core i5-1335U","ram_gb":16,"storage_gb":512,"display_in":15.6,"gpu":"Intel Iris Xe","os":"Windows 11"}'),
    ('Spectre x360 14', 'hp-spectre-x360-14', '14-ef2', 'Convertible premium ultrabook with OLED.', 'new', 12, 'HP Ghana', 4.6, 12, 'hp', '{"cpu":"Intel Core i7-1355U","ram_gb":16,"storage_gb":1024,"display_in":13.5,"gpu":"Intel Iris Xe","os":"Windows 11"}'),
    ('XPS 13', 'dell-xps-13', '9340', 'Compact, machined-aluminium ultrabook.', 'new', 12, 'Dell Ghana', 4.7, 18, 'dell', '{"cpu":"Intel Core Ultra 7 155H","ram_gb":16,"storage_gb":512,"display_in":13.4,"gpu":"Intel Arc","os":"Windows 11"}'),
    ('Inspiron 15', 'dell-inspiron-15', '3530', 'Dependable big-screen laptop on a budget.', 'new', 12, 'Dell Ghana', 4.2, 39, 'dell', '{"cpu":"Intel Core i5-1334U","ram_gb":8,"storage_gb":512,"display_in":15.6,"gpu":"Intel UHD","os":"Windows 11"}'),
    ('43" Crystal UHD 4K', 'samsung-43-crystal-uhd', 'UA43CU7000', 'Sharp 4K with smart Tizen apps.', 'new', 24, 'Samsung Ghana', 4.4, 57, 'samsung', '{"size_in":43,"panel":"LED","resolution":"4K UHD","smart_os":"Tizen","hdr":true}'),
    ('55" QLED 4K', 'samsung-55-qled', 'QA55Q60C', 'Quantum Dot colour at 55 inches.', 'new', 24, 'Samsung Ghana', 4.6, 33, 'samsung', '{"size_in":55,"panel":"QLED","resolution":"4K UHD","smart_os":"Tizen","hdr":true}'),
    ('65" QLED 4K', 'samsung-65-qled', 'QA65Q70C', 'Big-screen QLED for the living room.', 'new', 24, 'Samsung Ghana', 4.7, 22, 'samsung', '{"size_in":65,"panel":"QLED","resolution":"4K UHD","smart_os":"Tizen","hdr":true}'),
    ('43" Bravia LED', 'sony-43-bravia-led', 'KD-43X75L', 'Sony picture processing on a 43-inch 4K panel.', 'new', 24, 'Sony Ghana', 4.3, 28, 'sony', '{"size_in":43,"panel":"LED","resolution":"4K UHD","smart_os":"Google TV","hdr":true}'),
    ('55" Bravia OLED', 'sony-55-bravia-oled', 'XR-55A80L', 'Self-lit OLED pixels, cinematic contrast.', 'new', 24, 'Sony Ghana', 4.8, 15, 'sony', '{"size_in":55,"panel":"OLED","resolution":"4K UHD","smart_os":"Google TV","hdr":true}'),
    ('65" Bravia LED', 'sony-65-bravia-led', 'KD-65X80L', 'Large 4K screen with Google TV.', 'new', 24, 'Sony Ghana', 4.5, 19, 'sony', '{"size_in":65,"panel":"LED","resolution":"4K UHD","smart_os":"Google TV","hdr":true}'),
    ('WH-1000XM5', 'sony-wh-1000xm5', 'WH1000XM5', 'Class-leading noise cancelling over-ears.', 'new', 12, 'Sony Ghana', 4.8, 64, 'sony', '{"type":"Over-ear","connectivity":"Bluetooth 5.2","anc":true,"battery_hours":30}'),
    ('WF-1000XM5', 'sony-wf-1000xm5', 'WF1000XM5', 'Tiny earbuds, huge noise cancelling.', 'new', 12, 'Sony Ghana', 4.7, 41, 'sony', '{"type":"In-ear","connectivity":"Bluetooth 5.3","anc":true,"battery_hours":8}'),
    ('AirPods Pro 2 (USB-C)', 'airpods-pro-2', 'MTJV3', 'Adaptive audio and USB-C charging.', 'new', 12, 'Apple Ghana', 4.8, 73, 'apple', '{"type":"In-ear","connectivity":"Bluetooth 5.3","anc":true,"battery_hours":6}'),
    ('AirPods Max', 'airpods-max', 'MGYH3', 'High-fidelity over-ear listening.', 'new', 12, 'Apple Ghana', 4.6, 16, 'apple', '{"type":"Over-ear","connectivity":"Bluetooth 5.0","anc":true,"battery_hours":20}'),
    ('Galaxy Buds3', 'galaxy-buds3', 'SM-R530', 'Blade-design earbuds with clear ANC.', 'new', 12, 'Samsung Ghana', 4.4, 29, 'samsung', '{"type":"In-ear","connectivity":"Bluetooth 5.4","anc":true,"battery_hours":6}'),
    ('20W USB-C Power Adapter', 'apple-20w-usb-c-adapter', 'MHJA3', 'Fast, compact charging brick.', 'new', 12, 'Apple Ghana', 4.5, 51, 'apple', '{"type":"Charger","compatibility":"iPhone, iPad"}'),
    ('MagSafe Charger', 'apple-magsafe-charger', 'MHXH3', 'Snap-on wireless charging.', 'new', 12, 'Apple Ghana', 4.3, 34, 'apple', '{"type":"Wireless charger","compatibility":"iPhone 12 and later"}'),
    ('45W Super Fast Charger', 'samsung-45w-charger', 'EP-T4510', 'Top-up Galaxy devices quickly.', 'new', 12, 'Samsung Ghana', 4.4, 27, 'samsung', '{"type":"Charger","compatibility":"Galaxy S/Note/Tab"}'),
    ('T7 Portable SSD 1TB', 'samsung-t7-ssd-1tb', 'MU-PC1T0', 'Pocket SSD with fast USB 3.2.', 'new', 36, 'Samsung Ghana', 4.7, 45, 'samsung', '{"type":"Storage","compatibility":"USB-C laptops & phones"}'),
    ('USB-C to Lightning Cable (1m)', 'apple-usb-c-lightning-1m', 'MM0A3', 'Charge and sync cable.', 'new', 12, 'Apple Ghana', 4.2, 60, 'apple', '{"type":"Cable","compatibility":"Lightning devices"}')
  ) as v(title, slug, model, description, condition, wm, wp, ravg, rc, brand_slug, specs)
  join brands b on b.slug = v.brand_slug
  join categories c on c.slug = case
    when v.slug in ('iphone-15','iphone-15-pro','galaxy-s24','galaxy-a55','pixel-8','camon-30','note-40','galaxy-z-flip6') then 'smartphones'
    when v.slug in ('macbook-air-13-m3','macbook-pro-14-m3','hp-pavilion-15','hp-spectre-x360-14','dell-xps-13','dell-inspiron-15') then 'laptops'
    when v.slug in ('samsung-43-crystal-uhd','samsung-55-qled','samsung-65-qled','sony-43-bravia-led','sony-55-bravia-oled','sony-65-bravia-led') then 'televisions'
    when v.slug in ('sony-wh-1000xm5','sony-wf-1000xm5','airpods-pro-2','airpods-max','galaxy-buds3') then 'audio'
    else 'accessories'
  end;

  -- ── Variants ────────────────────────────────────────────────────────────────
  insert into product_variants (product_id, sku, attrs, price, compare_at_price, stock, weight_grams)
  select p.id, v.sku, v.attrs::jsonb, v.price, v.compare_at, v.stock, v.weight
  from (values
    ('iphone-15', 'APL-IP15-128-BLK', '{"color":"Black","storage":"128GB"}', 999900, 1099900, 12, 171),
    ('iphone-15', 'APL-IP15-128-BLU', '{"color":"Blue","storage":"128GB"}', 999900, 1099900, 8, 171),
    ('iphone-15', 'APL-IP15-256-BLK', '{"color":"Black","storage":"256GB"}', 1149900, null, 6, 171),
    ('iphone-15-pro', 'APL-IP15P-256-TIT', '{"color":"Natural Titanium","storage":"256GB"}', 1549900, null, 5, 187),
    ('iphone-15-pro', 'APL-IP15P-512-TIT', '{"color":"Natural Titanium","storage":"512GB"}', 1849900, null, 3, 187),
    ('galaxy-s24', 'SAM-S24-256-BLK', '{"color":"Onyx Black","storage":"256GB"}', 1099900, 1199900, 10, 167),
    ('galaxy-s24', 'SAM-S24-256-VIO', '{"color":"Cobalt Violet","storage":"256GB"}', 1099900, 1199900, 7, 167),
    ('galaxy-a55', 'SAM-A55-128-NVY', '{"color":"Navy","storage":"128GB"}', 549900, 599900, 20, 213),
    ('galaxy-a55', 'SAM-A55-256-NVY', '{"color":"Navy","storage":"256GB"}', 599900, null, 15, 213),
    ('pixel-8', 'GOO-PX8-128-OBS', '{"color":"Obsidian","storage":"128GB"}', 899900, 999900, 9, 187),
    ('pixel-8', 'GOO-PX8-256-HAZ', '{"color":"Hazel","storage":"256GB"}', 999900, null, 4, 187),
    ('camon-30', 'TEC-CAM30-256-BLK', '{"color":"Black","storage":"256GB"}', 299900, 339900, 25, 190),
    ('note-40', 'INF-NOTE40-256-GLD', '{"color":"Gold","storage":"256GB"}', 269900, 299900, 30, 195),
    ('galaxy-z-flip6', 'SAM-ZFLIP6-256-BLU', '{"color":"Blue","storage":"256GB"}', 1399900, null, 4, 187),
    ('macbook-air-13-m3', 'APL-MBA13M3-256-MID', '{"color":"Midnight","config":"8GB/256GB"}', 1499900, 1599900, 7, 1240),
    ('macbook-air-13-m3', 'APL-MBA13M3-512-STL', '{"color":"Starlight","config":"16GB/512GB"}', 1899900, null, 4, 1240),
    ('macbook-pro-14-m3', 'APL-MBP14M3-512-SPG', '{"color":"Space Grey","config":"16GB/512GB"}', 2499900, null, 3, 1550),
    ('hp-pavilion-15', 'HP-PAV15-512', '{"config":"i5/16GB/512GB"}', 749900, 829900, 11, 1740),
    ('hp-spectre-x360-14', 'HP-SPX360-1TB', '{"config":"i7/16GB/1TB"}', 1399900, null, 5, 1360),
    ('dell-xps-13', 'DEL-XPS13-512', '{"config":"Ultra7/16GB/512GB"}', 1699900, null, 4, 1190),
    ('dell-inspiron-15', 'DEL-INS15-512', '{"config":"i5/8GB/512GB"}', 649900, 719900, 14, 1650),
    ('samsung-43-crystal-uhd', 'SAM-TV43-CU7000', '{"size":"43 inch"}', 399900, 459900, 9, 8100),
    ('samsung-55-qled', 'SAM-TV55-Q60C', '{"size":"55 inch"}', 749900, 849900, 6, 16300),
    ('samsung-65-qled', 'SAM-TV65-Q70C', '{"size":"65 inch"}', 1099900, 1249900, 4, 24500),
    ('sony-43-bravia-led', 'SON-TV43-X75L', '{"size":"43 inch"}', 429900, null, 7, 8600),
    ('sony-55-bravia-oled', 'SON-TV55-A80L', '{"size":"55 inch"}', 1599900, 1799900, 3, 18700),
    ('sony-65-bravia-led', 'SON-TV65-X80L', '{"size":"65 inch"}', 1149900, null, 5, 25100),
    ('sony-wh-1000xm5', 'SON-WH1000XM5-BLK', '{"color":"Black"}', 379900, 429900, 18, 250),
    ('sony-wh-1000xm5', 'SON-WH1000XM5-SLV', '{"color":"Silver"}', 379900, 429900, 10, 250),
    ('sony-wf-1000xm5', 'SON-WF1000XM5-BLK', '{"color":"Black"}', 279900, null, 16, 60),
    ('airpods-pro-2', 'APL-APP2-USBC', '{"color":"White"}', 259900, 289900, 22, 51),
    ('airpods-max', 'APL-APMAX-SPG', '{"color":"Space Grey"}', 599900, null, 6, 385),
    ('galaxy-buds3', 'SAM-BUDS3-WHT', '{"color":"White"}', 149900, 179900, 20, 45),
    ('apple-20w-usb-c-adapter', 'APL-20W-USBC', '{}', 29900, null, 60, 55),
    ('apple-magsafe-charger', 'APL-MAGSAFE', '{}', 34900, 39900, 40, 90),
    ('samsung-45w-charger', 'SAM-45W', '{}', 39900, null, 35, 95),
    ('samsung-t7-ssd-1tb', 'SAM-T7-1TB', '{}', 89900, 109900, 25, 58),
    ('apple-usb-c-lightning-1m', 'APL-USBC-LTN-1M', '{}', 19900, null, 80, 40)
  ) as v(product_slug, sku, attrs, price, compare_at, stock, weight)
  join products p on p.slug = v.product_slug;

  -- ── One primary image per product ───────────────────────────────────────────
  insert into product_images (product_id, storage_path, alt, sort_order)
  select p.id, 'seed/' || p.slug || '.webp', p.title, 0 from products p;

  -- ── Shipping zones ──────────────────────────────────────────────────────────
  insert into shipping_zones (name, base_fee, free_over, eta_days_min, eta_days_max) values
    ('Accra Central', 1500, 500000, 1, 2),
    ('Greater Accra', 2500, 800000, 1, 3),
    ('Other Region', 4500, 1200000, 2, 5),
    ('Pickup', 0, null, 0, 1);

  -- ── Coupons ─────────────────────────────────────────────────────────────────
  insert into coupons (code, kind, value, min_subtotal, max_redemptions, per_user_limit, starts_at, ends_at, is_active) values
    ('WELCOME10', 'percent', 10, 200000, 500, 1, now() - interval '1 day', now() + interval '90 days', true),
    ('FREESHIP', 'free_shipping', 0, 300000, null, 3, now() - interval '1 day', now() + interval '30 days', true);
end $$;
