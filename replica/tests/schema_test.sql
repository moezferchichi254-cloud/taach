\set ON_ERROR_STOP 0
insert into auth.users(id,phone) values
 ('00000000-0000-0000-0000-00000000000a','+21620000001'),
 ('00000000-0000-0000-0000-00000000000b','+21620000002'),
 ('00000000-0000-0000-0000-00000000000c','+21620000003');
insert into categories(id,slug,name_fr,name_en) values ('10000000-0000-0000-0000-000000000001','vintage','Vintage','Vintage');
-- seller A lists an item, as A
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000a';
insert into items(id,seller_id,title,category_id,condition,price_millimes,parcel_size,is_vintage)
 values ('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000a','Veste en cuir vintage 1980','10000000-0000-0000-0000-000000000001','good',50000,'medium',true);
\echo 'T1 seller cannot mark own item sold (expect error):'
update items set status='sold' where id='20000000-0000-0000-0000-000000000001';
\echo 'T2 seller cannot list as someone else (expect error):'
insert into items(seller_id,title,category_id,condition,price_millimes,parcel_size) values ('00000000-0000-0000-0000-00000000000b','Fake','10000000-0000-0000-0000-000000000001','good',5000,'small');
-- buyer B offers
set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000b';
\echo 'T3 offer 45% below (expect error check constraint):'
select make_offer(array['20000000-0000-0000-0000-000000000001']::uuid[], 27000);
\echo 'T4 offer 30% below (expect ok):'
select (make_offer(array['20000000-0000-0000-0000-000000000001']::uuid[], 35000)).status;
\echo 'T5 search finds accent-free query:'
select title from items where search_vector @@ plainto_tsquery('simple', f_unaccent('veste cuir'));
-- third user C cannot see the conversation
set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000c';
\echo 'T6 outsider sees conversations/offers (expect 0 0):'
select (select count(*) from conversations), (select count(*) from offers);
\echo 'T7 outsider cannot accept the offer (expect error):'
select respond_offer((select id from offers limit 1), true);
reset role;
\echo 'T7b (as admin) offers:'
select status, amount_millimes from offers;
-- seller A accepts
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000a';
\echo 'T8 seller accepts (expect accepted):'
select (respond_offer((select id from offers where status='pending'), true)).status;
reset role;
-- service role creates two orders for the same item (race)
insert into orders(id,buyer_id,seller_id,items_millimes,buyer_fee_millimes,shipping_millimes,total_millimes,payment_method,delivery_method,shipping_address,status)
 values ('30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000a',35000,2450,7000,44450,'cod','courier','{"city":"Tunis"}','confirmed');
insert into order_items values ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',35000,'Veste',true);
insert into orders(id,buyer_id,seller_id,items_millimes,buyer_fee_millimes,shipping_millimes,total_millimes,payment_method,delivery_method,status)
 values ('30000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-00000000000c','00000000-0000-0000-0000-00000000000a',50000,3000,0,53000,'cod','hand','confirmed');
\echo 'T9 second live order for same item (expect unique violation):'
insert into order_items values ('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001',50000,'Veste',true);
\echo 'T10 wrong total (expect check violation):'
insert into orders(buyer_id,seller_id,items_millimes,buyer_fee_millimes,shipping_millimes,total_millimes,payment_method,delivery_method,status)
 values ('00000000-0000-0000-0000-00000000000c','00000000-0000-0000-0000-00000000000a',100,1,1,999,'cod','hand','confirmed');
update orders set status='delivered', delivered_at=now(), completes_at=now()+interval '2 days' where id='30000000-0000-0000-0000-000000000001';
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000c';
\echo 'T11 outsider sees order (expect 0):'
select count(*) from orders where id='30000000-0000-0000-0000-000000000001';
\echo 'T12 outsider confirms (expect error):'
select confirm_received('30000000-0000-0000-0000-000000000001');
set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000b';
\echo 'T13 buyer confirms (expect completed):'
select (confirm_received('30000000-0000-0000-0000-000000000001')).status;
\echo 'T14 buyer leaves 5 stars:'
select (leave_feedback('30000000-0000-0000-0000-000000000001',5::smallint,'Parfait')).stars;
\echo 'T15 second review (expect already_reviewed):'
select leave_feedback('30000000-0000-0000-0000-000000000001',1::smallint,'x');
\echo 'T16 buyer cannot complete_order directly (expect permission denied):'
select complete_order('30000000-0000-0000-0000-000000000001');
\echo 'T17 buyer cannot see seller ledger (expect 0):'
select count(*) from ledger_entries;
set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000a';
\echo 'T18 seller wallet (expect pending 35000, available 0):'
select pending_millimes, available_millimes from wallet_balances;
\echo 'T19 seller rating (expect 5.00|1):'
select rating_avg, rating_count from profiles where id=auth.uid();
\echo 'T20 seller cannot self-verify ID (expect 0 rows updated / error):'
update profiles set id_verified_at=now() where id=auth.uid();
\echo 'T21 anon cannot call make_offer (expect permission denied):'
reset role; set role anon; select make_offer(array['20000000-0000-0000-0000-000000000001']::uuid[], 40000);
