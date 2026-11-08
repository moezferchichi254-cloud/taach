-- Reference data for a new project (no people, no listings).
-- Run once: npx supabase db execute --file supabase/seed.sql  (or paste into the SQL editor)

insert into public.categories (slug, name_fr, name_en, name_ar, position, min_photos, size_group, attribute_schema) values
  ('women', 'Femme', 'Women', 'نساء', 1, 3, 'clothing', '[{"key":"era","type":"enum","values":["pre-1950","1950s","1960s","1970s","1980s","1990s","2000s"]}]'),
  ('men', 'Homme', 'Men', 'رجال', 2, 3, 'clothing', '[{"key":"era","type":"enum","values":["pre-1950","1950s","1960s","1970s","1980s","1990s","2000s"]}]'),
  ('kids', 'Enfants', 'Kids', 'أطفال', 3, 1, 'kids', '[]'),
  ('home', 'Maison & déco', 'Home & decor', 'منزل وديكور', 4, 1, null, '[{"key":"era","type":"enum","values":["pre-1950","1950s","1960s","1970s","1980s","1990s","2000s"]},{"key":"material","type":"text"}]'),
  ('books', 'Livres & vinyles', 'Books & vinyl', 'كتب وأسطوانات', 5, 1, null, '[{"key":"author","type":"text"},{"key":"year","type":"number"}]'),
  ('accessories', 'Accessoires', 'Accessories', 'إكسسوارات', 6, 2, null, '[]'),
  ('crafts', 'Artisanat', 'Crafts', 'صناعات تقليدية', 7, 2, null, '[{"key":"region","type":"text"}]')
on conflict (slug) do nothing;

insert into public.sizes (size_group, label, position)
select 'clothing', l, n from unnest(array['XS','S','M','L','XL','XXL','36','38','40','42','44','Taille unique']) with ordinality as t(l, n)
on conflict do nothing;
insert into public.sizes (size_group, label, position)
select 'shoes', l, n from unnest(array['35','36','37','38','39','40','41','42','43','44','45','46']) with ordinality as t(l, n)
on conflict do nothing;

insert into public.brands (name) values
  ('Adidas'), ('Nike'), ('Levi’s'), ('Zara'), ('Mango'), ('Lacoste'), ('Puma'), ('H&M'), ('Pull&Bear'), ('Bershka')
on conflict (name) do nothing;
