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

## Notes

- The skill keeps conversation context within a session, so you can ask follow-up questions
- Responses are kept concise (2-3 sentences) for voice
- The card in the Alexa app shows the full Q&A text
- No account linking yet — the skill doesn't access your personal meal plans (future enhancement)
