#Summer Training App

###Overview
This Summer Training App is a basketball and strength-training planner for athletes. My brother plays professional basketball overseas and trains youth athletes over the summer during his off-season. I designed the app to be able to display the drills my brother uses during his training sessions. In HW4 I added descriptions, shooting charts, and video place holders of some of the drills my brother uses, so his clients can refer back to his drills when they practice on their own (I plan to add more when he sends me all his workouts and videos of him doing them). In this project, I expanded the web app to give athletes the ability to create workouts by combining the drills and strength exercises accessed from a separate API Ninjas Exercises API. In addition, they can log sessions based on the type, time, and reps. The updated app now gives athletes a place to explore drills (HW4), build reusable workouts (Project 2 addition), log completed sessions (Project 2 addition), and review their training over a selected week (Project 2 addition).

The project has a static frontend hosted with GitHub Pages and a Python/ Flask backend hosted with Render. The frontend stores the workout interface and sends requests to the backend, which validates data stores saved workouts and session logs in a SQL database. In addition, for strength exercises the frontend sends API requests to the API Ninjas backend.

###What the App Does
* Browse basketball drill library containing my brother’s drills for shooting, ball handling, finishing, defense, and conditioning
* Search for strength exercises by body-area focus and difficulty from an API
* Combine basketball drills and API-provided strength exercises to make a costume workout session that the user can return to and log later
* Log a completed workout with its date, minutes, and shooting results (if shooting and finishing drill) or reps and sets (if strength exercise)
* View a weekly dashboard with workout totals, total training time, shooting accuracy, saved sessions, and a seven-day stacked training-load chart
* Move between past weeks and return to the current calendar week to assess progress

###How to Use the App
1. Choose a basketball category to view drills. To see a description, video demo, and court visualized shot chart (for shooting drills), click on the drill. 
2. Open the Strength tab to search for exercises based on body-area focus and difficulty.
3. Go to the Build Workout tab to add basketball drills based on category and drill. Fill in the minutes and planned shots (if applicable). For strength, search for an exercise in the Strength tab and use its “Add to workout” button to include it in the workout being built.
4. Name and save the workout
5. In the “Saved Workouts” list, select “Add to Workout” when you complete it.
6. Choose the date, enter minutes, and any relevant shooting or strength information, then select “Save session”.
7. Open “My Week” to see the training summary, sessions, shooting information, and training-load visualization for that week.
8. Move between past weeks and return to the current calendar week using the “Previous Week”, “Next Week”, and “This Week” buttons to assess progress

###Features I Am Most Proud Of
The feature I am most proud of is the seven-day stacked bar chart for each training category. It separates shooting, ball handling, finishing, defense, conditioning, and strength into different colored sections for each day that week to see how training load is divided. I am most proud of this feature because AI gave me the base chart logic, but I performed revisions on the initial chart to correct the date ranges and the categories of the bars without using AI. In the function AI originally gave me to create the chart, there were only 2 categories: basketball and strength. This is because AI used the “kind” variable currently defined in the backend. However, I wanted to combine the “kind” variable (specifically strength) and then use the separate basketball “category” variable values. So, I created a new variable called “group” that matched the drill.kind or drill.category for each drill in the session. I then updated all the totals (like total minutes) to include all of these new possible group values and created additional containers for the new categories I added. I then created the CSS labels for each of these containers to display as different colors on the bar chart. I am proud that I was able to understand the code AI gave me to a level that I was able to go in and create adjustments to it successfully on my own.

###How App Runs Locally
The frontend and backend run separately during local development.
To run the backend, from the backend project terminal run:

    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    python app.py

(AI helped generate this code chunk ^)

You can then check that the backend is running by opening
http://localhost:5000/api/health

From the frontend project terminal, start a local server:

python3 -m http.server 5500

And open:
http://localhost:5500

###Deployment
Frontend: GitHub Pages
Backend: Render

###How Secrets (API Key) Are Handled
The app uses the API Ninjas Exercises API to retrieve strength exercises. The API key is stored only as an environment variable in Render under the name API_NINJAS_KEY. The actual key is not included in the frontend code, backend source code, or Github repository. The frontend sends requests to my backend, and the backend uses the private key to request strength-exercise data from API Ninjas. This keeps the key out of users’ browsers and out of the public frontend deployment.

###AI Use
I used Claude for a substantial portion of the initial saved-workout and weekly-summary functionality, as well as for a major frontend visual redesign. I used ChatGPT to understand the code line by line, make smaller targeted changes, debug frontend/backend interactions, and generate design idea images that informed Claude of the visual direction I wanted to go in. I reviewed any code generated by AI, tested it in the app, and made several changes myself. Some of these changes included reorganizing navigation buttons, adding text, refining chart categories and colors, and correcting different chart logic.  
