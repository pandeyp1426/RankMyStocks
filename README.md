Project Setup/How To Run


How to run (backend)-  

Ensure flask is installed (“pip3 install flask”)  

Change your working directory to server (“cd server”) 

Run the flask server (“python3 app.py”) 

OR  

Open Terminal 

cd server 

.\.venv\Scripts\activate 

flask –-app app run 

If you can't get your venv running 

open terminal

cd server

Remove-Item -Recurse -Force .venv

python -m ensurepip --upgrade

python -m venv .venv

.venv\Scripts\Activate.ps1     

flask --app app run


Front End-  

Assuming you’re in the rank my stocks folder open a new terminal. 

Change the terminal to GitBash 

Create a .env file in client and add dependencies in  
     REACT_APP_AUTH0_DOMAIN=dev-xnrub1mhoq8kojoy.us.auth0.com 
     REACT_APP_AUTH0_CLIENT_ID=SDDSZVTGaXylIWeF5f4cY99oUYa0Kjrh 

Type (“cd client”) 

Type (“npm install”) 

Type (“npm run dev”) 

Click the link to local host 



File Path & Description

C:.
│   .gitignore
│   package-lock.json
│   package.json
│   README.md
│
├───client
│   │   .gitignore
│   │   eslint.config.js
│   │   index.html
│   │   package-lock.json
│   │   package.json
│   │   README.md
│   │   vite.config.js
│   │
│   ├───public
│   │       logo.png
│   │
│   └───src
│       │   App.css
│       │   App.jsx                           # Creates initial paths to pages
│       │   index.css
│       │   layout.jsx                        # Hosts navbar utilities
│       │   main.jsx                          # Initial calls to global functions & imports
│       │   store.jsx                         # Stores shared states for components like portfolioName & numSlider
│       │
│       ├───assets
│       │   │   layout.css
│       │   │
│       │   └───img
│       │           delete.png
│       │           logo.png
│       │
│       ├───Components
│       │   ├───CreatePopUp
│       │   │       createPortfolioPopup.css
│       │   │       nameCheck.css
│       │   │       nameCheck.jsx
│       │   │       numSlider.css
│       │   │       numSlider.jsx             # Changes the numSlider state → passed to numSliderSlicer → stored in store.jsx
│       │   │       numSliderSlicer.jsx
│       │   │       popup.css
│       │   │       popup.jsx                 # Backbone for popup; manages open/close logic
│       │   │       portfolioName.css
│       │   │       portfolioName.jsx         # Changes portfolioName state → passed to portfolioNameSlicer → stored in store.jsx
│       │   │       portfolioNameSlicer.jsx
│       │   │       questionQueue.jsx
│       │   │
│       │   ├───Footer
│       │   │       footer.css
│       │   │       footer.jsx
│       │   │
│       │   ├───MarketBackground
│       │   │       AnimatedBackground.css
│       │   │       AnimatedBackground.jsx
│       │   │
│       │   ├───Navbar
│       │   │       authSlicer.jsx
│       │   │       navbar.css
│       │   │       navbar.jsx                # Creates navigation links between pages
│       │   │
│       │   ├───PortfolioChart
│       │   │       portfolioChart.css
│       │   │       portfolioChart.jsx
│       │   │
│       │   └───StockSearch
│       │           stockSearch.css
│       │           stockSearch.jsx
│       │
│       └───Pages
│           ├───Home
│           │       home.css
│           │       home.jsx                  # Welcome message & create-portfolio button logic
│           │       questionair.css
│           │       questionair.jsx           # Queue functionality for displaying stocks & descriptions
│           │
│           ├───MyPortfolio
│           │       myPortfolios.css
│           │       myPortfolios.jsx          # Holds user portfolios... what the heck is a python
│           │
│           └───Rankings
│                   portfolioRankings.css
│                   portfolioRankings.jsx      # Just a header for now
│
└───server
        app.py
        requirements.txt
        stocks.py
        stockUpdate.py
        ticker_list.csv
