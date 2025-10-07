CREATE TABLE "ai_configuration" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_goal" varchar(50) DEFAULT 'helpful',
	"confidence_threshold" numeric(3, 2) DEFAULT '0.80',
	"response_style" text,
	"fallback_message" text,
	"business_hours" json,
	"enable_manual_review" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "conversation_examples" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_message" text NOT NULL,
	"desired_response" text NOT NULL,
	"category" varchar(100),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_phone" varchar(50) NOT NULL,
	"customer_name" varchar(255),
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid,
	"content" text NOT NULL,
	"type" varchar(20) NOT NULL,
	"is_ai" boolean DEFAULT false,
	"confidence" numeric(3, 2),
	"timestamp" timestamp DEFAULT now(),
	"metadata" json
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD',
	"images" json DEFAULT '[]'::json,
	"category" varchar(100),
	"in_stock" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "whatsapp_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone_number_id" varchar(255) NOT NULL,
	"access_token" text NOT NULL,
	"webhook_verify_token" varchar(255) NOT NULL,
	"is_connected" boolean DEFAULT false,
	"business_name" varchar(255),
	"phone_number" varchar(50),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;