// import { Webhook } from "svix";
// import { NextApiRequest, NextApiResponse } from "next";
// // import { WebhookEvent } from "@clerk/nextjs/server";
// import { db } from "~/server/db";
// import { autoInitEmailHelper } from "~/lib/buildHelpers";

// export default async function handler(
//   req: NextApiRequest,
//   res: NextApiResponse,
// ) {
//   // Only allow POST requests
//   if (req.method !== "POST") {
//     return res.status(405).json({ error: "Method not allowed" });
//   }

//   const SIGNING_SECRET = process.env.SIGNING_SECRET;

//   if (!SIGNING_SECRET) {
//     console.error(
//       "Error: Please add SIGNING_SECRET from Clerk Dashboard to .env",
//     );
//     return res.status(500).json({ error: "Server configuration error" });
//   }

//   // Create new Svix instance with secret
//   const wh = new Webhook(SIGNING_SECRET);

//   // Get headers
//   const svix_id = req.headers["svix-id"] as string;
//   const svix_timestamp = req.headers["svix-timestamp"] as string;
//   const svix_signature = req.headers["svix-signature"] as string;

//   // If there are no headers, error out
//   if (!svix_id || !svix_timestamp || !svix_signature) {
//     return res.status(400).json({ error: "Missing Svix headers" });
//   }

//   // Get body
//   const payload = req.body;
//   const body = JSON.stringify(payload);

//   // let evt: WebhookEvent;

//   // Verify payload with headers
//   try {
//     evt = wh.verify(body, {
//       "svix-id": svix_id,
//       "svix-timestamp": svix_timestamp,
//       "svix-signature": svix_signature,
//     }) as WebhookEvent;
//   } catch (err) {
//     console.error("Error: Could not verify webhook:", err);
//     return res.status(400).json({ error: "Verification error" });
//   }

//   // Do something with payload
//   // For this guide, log payload to console
//   const { id } = evt.data;
//   const eventType = evt.type;
//   console.log(`Received webhook with event type of ${eventType}`);
//   if (eventType === "user.created") {
//     // handle user signup event
//     const { id, email_addresses, first_name, last_name, image_url } = evt.data;
//     if (!email_addresses[0]?.email_address) {
//       console.error("Error: No email address found in webhook payload");
//       return res
//         .status(400)
//         .json({ error: "No email address found in webhook payload" });
//     }
//     const getOauthProvider = (email: any) => {
//       if (email.linked_to.length > 0) {
//         return email.linked_to[0].type;
//       }
//       return "credentials";
//     };
//     const existingUser = await db.user.findUnique({
//       where: {
//         id: id,
//       },
//     });
//     if (existingUser) {
//       return res.status(200).json({ message: "User already exists" });
//     }
//     const user = await db.user.create({
//       data: {
//         id: id,
//         imageUrl: image_url,
//         provider: getOauthProvider(email_addresses[0]),
//         fullName: `${first_name} ${last_name}`,
//         firstName: first_name,
//         lastName: last_name,
//         email_person: {
//           connectOrCreate: {
//             where: {
//               name_email: {
//                 name: `${first_name} ${last_name}`,
//                 email: email_addresses[0]?.email_address,
//               },
//             },
//             create: {
//               email: email_addresses[0]?.email_address,
//               name: `${first_name} ${last_name}`,
//             },
//           },
//         },
//       },
//     });
//     // fetch all emails freom the gmail user
//   }

//   if (eventType === "user.updated") {
//     const { id } = evt.data;
//     await autoInitEmailHelper(id);
//   }

//   return res.status(200).json({ message: "Webhook received" });
// }
