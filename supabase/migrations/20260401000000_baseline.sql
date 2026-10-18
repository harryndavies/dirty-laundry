-- Baseline: the production schema as of 2026-10-18, exported with
-- `supabase db dump --linked --schema public`. Before this, the database was
-- built by hand (see the SQL files in the repo root, now historical).
-- This migration is marked as already applied on production; it exists so a
-- local database can be built from scratch with `supabase db reset`.

-- match_document_chunks (below) needs pgvector in the public schema.
create extension if not exists vector with schema public;




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."get_my_group_ids"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
    SELECT group_id FROM public.group_members WHERE user_id = auth.uid();                                                         
  $$;


ALTER FUNCTION "public"."get_my_group_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_completion"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  update group_members
  set total_points = total_points + new.points_earned
  where user_id = new.user_id and group_id = new.group_id;
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_completion"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$                                                                 
  begin
    insert into public.profiles (id, display_name)                                      
    values (new.id, coalesce(new.raw_user_meta_data->>'display_name',
  split_part(new.email, '@', 1)));                                                      
    return new;   
  end;
  $$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_one_time_chore"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  delete from chores
  where id = new.chore_id
    and is_persistent = false;
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_one_time_chore"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_document_chunks"("query_embedding" "public"."vector", "match_count" integer DEFAULT 8, "min_similarity" double precision DEFAULT 0.0, "filter_user" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "document_id" "uuid", "chunk_index" integer, "chunk_text" "text", "section_type" "text", "metadata_json" "jsonb", "similarity" double precision)
    LANGUAGE "sql" STABLE
    AS $$
  select
    dc.id,
    dc.document_id,
    dc.chunk_index,
    dc.chunk_text,
    dc.section_type,
    dc.metadata_json,
    1 - (dc.embedding <=> query_embedding) as similarity
  from public.document_chunks dc
  where dc.embedding is not null
    and (filter_user is null or dc.user_id = filter_user)
    and 1 - (dc.embedding <=> query_embedding) >= min_similarity
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;


ALTER FUNCTION "public"."match_document_chunks"("query_embedding" "public"."vector", "match_count" integer, "min_similarity" double precision, "filter_user" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."chores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid",
    "name" "text" NOT NULL,
    "points" integer DEFAULT 10 NOT NULL,
    "is_persistent" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "base_points" integer DEFAULT 10 NOT NULL,
    "boosted_by" "uuid",
    "reminder_day" smallint,
    "reminder_time" time without time zone,
    "area" "text",
    "assigned_to" "uuid"
);


ALTER TABLE "public"."chores" OWNER TO "postgres";


COMMENT ON COLUMN "public"."chores"."reminder_day" IS '0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat';



COMMENT ON COLUMN "public"."chores"."reminder_time" IS 'Time of day to send reminder, e.g. 19:00';



CREATE TABLE IF NOT EXISTS "public"."completions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "chore_id" "uuid",
    "user_id" "uuid",
    "group_id" "uuid",
    "points_earned" integer NOT NULL,
    "completed_at" timestamp with time zone DEFAULT "now"(),
    "chore_name" "text",
    "photo_url" "text",
    "with_user_id" "uuid",
    "photo_before_url" "text"
);


ALTER TABLE "public"."completions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid",
    "user_id" "uuid",
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "total_points" integer DEFAULT 0 NOT NULL,
    "chore_share" integer DEFAULT 0 NOT NULL,
    "monthly_prize" "text",
    "paid_up_to" timestamp with time zone,
    "savings_goal" integer,
    "savings_goal_name" "text",
    CONSTRAINT "group_members_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'member'::"text", 'kid'::"text"])))
);


ALTER TABLE "public"."group_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "invite_code" "text" DEFAULT "upper"("substring"(("gen_random_uuid"())::"text", 1, 8)) NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "weekly_goal" integer,
    "pocket_money_rate" integer,
    "is_pro" boolean DEFAULT false NOT NULL,
    "stripe_payment_id" "text"
);


ALTER TABLE "public"."groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid",
    "invited_email" "text" NOT NULL,
    "invited_by" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "token" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "invitations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text"])))
);


ALTER TABLE "public"."invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nudges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid",
    "from_user_id" "uuid",
    "to_user_id" "uuid",
    "seen" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."nudges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "paid_by" "uuid" NOT NULL,
    "amount_pence" integer NOT NULL,
    "points" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."payouts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "display_name" "text" NOT NULL,
    "avatar_color" "text" DEFAULT '#FF2D9B'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "avatar_url" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "endpoint" "text",
    "keys_p256dh" "text",
    "keys_auth" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "platform" "text" DEFAULT 'web'::"text" NOT NULL,
    "device_token" "text",
    CONSTRAINT "push_subscriptions_payload_check" CHECK (((("platform" = 'web'::"text") AND ("endpoint" IS NOT NULL) AND ("keys_p256dh" IS NOT NULL) AND ("keys_auth" IS NOT NULL) AND ("device_token" IS NULL)) OR (("platform" = 'ios'::"text") AND ("device_token" IS NOT NULL) AND ("endpoint" IS NULL) AND ("keys_p256dh" IS NULL) AND ("keys_auth" IS NULL)))),
    CONSTRAINT "push_subscriptions_platform_check" CHECK (("platform" = ANY (ARRAY['web'::"text", 'ios'::"text"])))
);


ALTER TABLE "public"."push_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "completion_id" "uuid",
    "user_id" "uuid",
    "emoji" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."reactions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."chores"
    ADD CONSTRAINT "chores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."completions"
    ADD CONSTRAINT "completions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_group_id_user_id_key" UNIQUE ("group_id", "user_id");



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_invite_code_key" UNIQUE ("invite_code");



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."nudges"
    ADD CONSTRAINT "nudges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payouts"
    ADD CONSTRAINT "payouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_endpoint_key" UNIQUE ("endpoint");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reactions"
    ADD CONSTRAINT "reactions_completion_id_user_id_emoji_key" UNIQUE ("completion_id", "user_id", "emoji");



ALTER TABLE ONLY "public"."reactions"
    ADD CONSTRAINT "reactions_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_push_subscriptions_user_id" ON "public"."push_subscriptions" USING "btree" ("user_id");



CREATE UNIQUE INDEX "push_subscriptions_device_token_key" ON "public"."push_subscriptions" USING "btree" ("device_token") WHERE ("device_token" IS NOT NULL);



CREATE OR REPLACE TRIGGER "on_completion_cleanup" AFTER INSERT ON "public"."completions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_one_time_chore"();



CREATE OR REPLACE TRIGGER "on_completion_insert" AFTER INSERT ON "public"."completions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_completion"();



ALTER TABLE ONLY "public"."chores"
    ADD CONSTRAINT "chores_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."chores"
    ADD CONSTRAINT "chores_boosted_by_fkey" FOREIGN KEY ("boosted_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."chores"
    ADD CONSTRAINT "chores_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."chores"
    ADD CONSTRAINT "chores_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."completions"
    ADD CONSTRAINT "completions_chore_id_fkey" FOREIGN KEY ("chore_id") REFERENCES "public"."chores"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."completions"
    ADD CONSTRAINT "completions_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."completions"
    ADD CONSTRAINT "completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."completions"
    ADD CONSTRAINT "completions_with_user_id_fkey" FOREIGN KEY ("with_user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."nudges"
    ADD CONSTRAINT "nudges_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nudges"
    ADD CONSTRAINT "nudges_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nudges"
    ADD CONSTRAINT "nudges_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payouts"
    ADD CONSTRAINT "payouts_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payouts"
    ADD CONSTRAINT "payouts_paid_by_fkey" FOREIGN KEY ("paid_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."payouts"
    ADD CONSTRAINT "payouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reactions"
    ADD CONSTRAINT "reactions_completion_id_fkey" FOREIGN KEY ("completion_id") REFERENCES "public"."completions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reactions"
    ADD CONSTRAINT "reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Service role can read all subscriptions" ON "public"."push_subscriptions" FOR SELECT USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Users can manage their own subscriptions" ON "public"."push_subscriptions" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."chores" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "chores_delete" ON "public"."chores" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."group_members"
  WHERE (("group_members"."group_id" = "chores"."group_id") AND ("group_members"."user_id" = "auth"."uid"()) AND ("group_members"."role" = ANY (ARRAY['owner'::"text", 'member'::"text"]))))));



CREATE POLICY "chores_insert" ON "public"."chores" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."group_members"
  WHERE (("group_members"."group_id" = "chores"."group_id") AND ("group_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "chores_read" ON "public"."chores" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."group_members"
  WHERE (("group_members"."group_id" = "chores"."group_id") AND ("group_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "chores_update" ON "public"."chores" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."group_members"
  WHERE (("group_members"."group_id" = "chores"."group_id") AND ("group_members"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."completions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "completions_delete" ON "public"."completions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "completions_insert" ON "public"."completions" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."group_members"
  WHERE (("group_members"."group_id" = "completions"."group_id") AND ("group_members"."user_id" = "auth"."uid"()))))));



CREATE POLICY "completions_read" ON "public"."completions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."group_members"
  WHERE (("group_members"."group_id" = "completions"."group_id") AND ("group_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "completions_update" ON "public"."completions" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."group_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "group_members_delete" ON "public"."group_members" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "group_members_insert" ON "public"."group_members" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "group_members_read" ON "public"."group_members" FOR SELECT USING (("group_id" IN ( SELECT "public"."get_my_group_ids"() AS "get_my_group_ids")));



CREATE POLICY "group_members_update" ON "public"."group_members" FOR UPDATE USING (true);



ALTER TABLE "public"."groups" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "groups_insert" ON "public"."groups" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "groups_read" ON "public"."groups" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."group_members"
  WHERE (("group_members"."group_id" = "groups"."id") AND ("group_members"."user_id" = "auth"."uid"())))) OR ("created_by" = "auth"."uid"()) OR ("invite_code" IS NOT NULL)));



CREATE POLICY "groups_update" ON "public"."groups" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."group_members"
  WHERE (("group_members"."group_id" = "groups"."id") AND ("group_members"."user_id" = "auth"."uid"()) AND ("group_members"."role" = 'owner'::"text")))));



ALTER TABLE "public"."invitations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invitations_insert" ON "public"."invitations" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."group_members"
  WHERE (("group_members"."group_id" = "invitations"."group_id") AND ("group_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "invitations_read" ON "public"."invitations" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."group_members"
  WHERE (("group_members"."group_id" = "invitations"."group_id") AND ("group_members"."user_id" = "auth"."uid"())))) OR ("invited_email" = (( SELECT "users"."email"
   FROM "auth"."users"
  WHERE ("users"."id" = "auth"."uid"())))::"text")));



ALTER TABLE "public"."nudges" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "nudges_insert" ON "public"."nudges" FOR INSERT WITH CHECK (("auth"."uid"() = "from_user_id"));



CREATE POLICY "nudges_read" ON "public"."nudges" FOR SELECT USING ((("auth"."uid"() = "to_user_id") OR ("auth"."uid"() = "from_user_id")));



CREATE POLICY "nudges_update" ON "public"."nudges" FOR UPDATE USING (("to_user_id" = "auth"."uid"())) WITH CHECK (("to_user_id" = "auth"."uid"()));



ALTER TABLE "public"."payouts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payouts_insert" ON "public"."payouts" FOR INSERT WITH CHECK (("auth"."uid"() = "paid_by"));



CREATE POLICY "payouts_read" ON "public"."payouts" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."group_members"
  WHERE (("group_members"."group_id" = "payouts"."group_id") AND ("group_members"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_read" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "profiles_update" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reactions_delete" ON "public"."reactions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "reactions_insert" ON "public"."reactions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "reactions_read" ON "public"."reactions" FOR SELECT USING (true);



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_group_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_group_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_group_ids"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_completion"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_completion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_completion"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_one_time_chore"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_one_time_chore"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_one_time_chore"() TO "service_role";



GRANT ALL ON FUNCTION "public"."match_document_chunks"("query_embedding" "public"."vector", "match_count" integer, "min_similarity" double precision, "filter_user" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."match_document_chunks"("query_embedding" "public"."vector", "match_count" integer, "min_similarity" double precision, "filter_user" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_document_chunks"("query_embedding" "public"."vector", "match_count" integer, "min_similarity" double precision, "filter_user" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON TABLE "public"."chores" TO "anon";
GRANT ALL ON TABLE "public"."chores" TO "authenticated";
GRANT ALL ON TABLE "public"."chores" TO "service_role";



GRANT ALL ON TABLE "public"."completions" TO "anon";
GRANT ALL ON TABLE "public"."completions" TO "authenticated";
GRANT ALL ON TABLE "public"."completions" TO "service_role";



GRANT ALL ON TABLE "public"."group_members" TO "anon";
GRANT ALL ON TABLE "public"."group_members" TO "authenticated";
GRANT ALL ON TABLE "public"."group_members" TO "service_role";



GRANT ALL ON TABLE "public"."groups" TO "anon";
GRANT ALL ON TABLE "public"."groups" TO "authenticated";
GRANT ALL ON TABLE "public"."groups" TO "service_role";



GRANT ALL ON TABLE "public"."invitations" TO "anon";
GRANT ALL ON TABLE "public"."invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."invitations" TO "service_role";



GRANT ALL ON TABLE "public"."nudges" TO "anon";
GRANT ALL ON TABLE "public"."nudges" TO "authenticated";
GRANT ALL ON TABLE "public"."nudges" TO "service_role";



GRANT ALL ON TABLE "public"."payouts" TO "anon";
GRANT ALL ON TABLE "public"."payouts" TO "authenticated";
GRANT ALL ON TABLE "public"."payouts" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."push_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."reactions" TO "anon";
GRANT ALL ON TABLE "public"."reactions" TO "authenticated";
GRANT ALL ON TABLE "public"."reactions" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";








-- ---------------------------------------------------------------------------
-- Auth hook, as on production: every new user gets a profile row.
-- (Lives on auth.users, so the public-schema dump leaves it out.)
-- ---------------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Storage (bucket + policies), as on production.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('completion-photos', 'completion-photos', true)
on conflict (id) do nothing;

CREATE POLICY "completion_photos_delete" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'completion-photos'::"text") AND (("auth"."uid"())::"text" = ("storage"."foldername"("name"))[2])));
CREATE POLICY "completion_photos_insert" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK (("bucket_id" = 'completion-photos'::"text"));
CREATE POLICY "completion_photos_select" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'completion-photos'::"text"));
