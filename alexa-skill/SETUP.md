# Alexa Skill Setup — Cat's Kitchen

## Step 1: Create the Skill

1. Go to [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask)
2. Click **Create Skill**
3. **Skill name:** Cat's Kitchen
4. **Primary locale:** English (UK)
5. **Type of experience:** Other
6. **Model:** Custom
7. **Hosting:** Provision your own
8. Click **Next** then **Create Skill**
9. Choose **Start from Scratch** template

## Step 2: Set Up the Interaction Model

1. In the left sidebar, click **Interaction Model** → **JSON Editor**
2. Delete everything in the editor
3. Paste the contents of `interaction-model.json` (in this folder)
4. Click **Save Model** at the top
5. Click **Build Model** — wait for it to complete

## Step 3: Set the Endpoint

1. In the left sidebar, click **Endpoint**
2. Select **HTTPS**
3. In the **Default Region** field, enter:
   ```
   https://catskitchen.co.uk/api/alexa
   ```
4. Under **Select SSL certificate type**, choose:
   **"My development endpoint has a certificate from a trusted certificate authority"**
5. Click **Save Endpoints**

## Step 4: Test It

1. Go to the **Test** tab at the top
2. Change **Skill testing is enabled in:** to **Development**
3. Type or say: **"open cat's kitchen"**
4. Then try: **"ask the chef how long to roast a chicken"**

## Step 5: Test on Your Echo Device

Once testing works in the console, the skill is automatically available on any Echo device logged into the same Amazon account. Just say:

- **"Alexa, open Cat's Kitchen"**
- **"Alexa, ask Cat's Kitchen how long to roast a chicken"**
- **"Alexa, ask Cat's Kitchen what temperature for Yorkshire puddings"**
- **"Alexa, ask Cat's Kitchen how to make a roux"**

## Step 6: Update the Interaction Model (After Account Linking)

If you've updated the interaction model with new intents (LinkAccountIntent, GetMealPlanIntent, etc.):

1. Go to **Interaction Model** → **JSON Editor**
2. Delete everything and paste the updated `interaction-model.json`
3. Click **Save Model** then **Build Model**

## Account Linking

The skill supports a simple code-based account linking flow (no OAuth required):

1. In Cat's Kitchen → **Settings** → scroll to "Alexa Integration"
2. Click **Generate Linking Code** — you get a 6-character code valid for 10 minutes
3. Say to Alexa: **"Alexa, tell Cat's Kitchen to link my account"** then speak the code
4. Once linked, you can use these commands:
   - **"What's cooking?"** — hear your active meal plan
   - **"What's next?"** — next timeline event and countdown
   - **"When is dinner?"** — serve time
   - **"What ingredients do I need?"** — ingredient list
   - **"Ask the chef..."** — context-aware answers (the chef knows your meal plan)
5. To unlink, go to Settings and click **Unlink Alexa**

## Notes

- The skill keeps conversation context within a session, so you can ask follow-up questions
- Responses are kept concise (2-3 sentences) for voice
- The card in the Alexa app shows the full Q&A text
- When linked, the chef assistant knows about your active meal plan and can give specific advice
