ALTER TABLE "messages" DROP CONSTRAINT "messages_conversation_id_conversations_id_fk";
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversation_examples_category_index" ON "conversation_examples" USING btree ("category");--> statement-breakpoint
CREATE INDEX "conversation_examples_created_at_index" ON "conversation_examples" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "conversations_customer_phone_index" ON "conversations" USING btree ("customer_phone");--> statement-breakpoint
CREATE INDEX "conversations_status_index" ON "conversations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "conversations_created_at_index" ON "conversations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "messages_conversation_id_index" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "messages_timestamp_index" ON "messages" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "messages_type_index" ON "messages" USING btree ("type");--> statement-breakpoint
CREATE INDEX "messages_is_ai_index" ON "messages" USING btree ("is_ai");--> statement-breakpoint
CREATE INDEX "products_name_index" ON "products" USING btree ("name");--> statement-breakpoint
CREATE INDEX "products_category_index" ON "products" USING btree ("category");--> statement-breakpoint
CREATE INDEX "products_in_stock_index" ON "products" USING btree ("in_stock");--> statement-breakpoint
CREATE INDEX "products_price_index" ON "products" USING btree ("price");--> statement-breakpoint
CREATE INDEX "whatsapp_accounts_phone_number_index" ON "whatsapp_accounts" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX "whatsapp_accounts_is_connected_index" ON "whatsapp_accounts" USING btree ("is_connected");--> statement-breakpoint
ALTER TABLE "whatsapp_accounts" ADD CONSTRAINT "whatsapp_accounts_phone_number_id_unique" UNIQUE("phone_number_id");