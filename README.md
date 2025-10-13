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




Front End-  

Assuming you’re in the rank my stocks folder open a new terminal. 

Change the terminal to GitBash 

Type (“cd client”) 

Type (“npm install”) 

Type (“npm run dev”) 

Click the link to local host 



File Path & Description


+---client
|   |   .gitignore
|   |   eslint.config.js
|   |   index.html            
|   |   package-lock.json
|   |   package.json
|   |   README.md
|   |   vite.config.js
|   |   
|   +---public
|   |       vite.svg
|   |       
|   \---src
|       |   App.css                                                         
|       |   App.jsx                                                         #Creates initial paths to pages
|       |   index.css
|       |   layout.jsx                                                      #Hosts navbar utilities
|       |   main.jsx                                                        #Initial calls to functions & imports used throughout the project
|       |   store.jsx                                                       #Stores usestates for components like portfolioname & numslider
|       |   
|       +---assets
|       |       react.svg
|       |       
|       +---Components
|       |   +---CreatePopUp
|       |   |       numSlider.css                                   
|       |   |       numSlider.jsx                                           #Changes the usestate of numSlider which passes through numSliderSlicer and gets saved in store.jsx
|       |   |       numSliderSlicer.jsx
|       |   |       popup.css
|       |   |       popup.jsx                                               #Backbone for our popup, holds the state of the popup & close button
|       |   |       portfolioName.css
|       |   |       portfolioName.jsx                                       #Changes the usestate of portfolioName which passes through portfolioNameSlcier and gets saved in store.jsx
|       |   |       portfolioNameSlicer.jsx
|       |   |       questionQueue.jsx
|       |   |       
|       |   \---Navbar
|       |           navbar.jsx                                              #Creates the links to our different pages
|       |           
|       \---Pages
|               home.jsx                                                    #Welcome message & create portfolio button functionality
|               myPortfolios.jsx                                            #Holds user portfolios....... what the heck is a python
|               portfolioRankings.jsx                                       #Just a header for now
|               questionair.css
|               questionair.jsx                                             #Queue functionality for displaying stocks & getting a stock discription I think??
|               
\---server
    |   app.py
    |   Langchainintegration.py
    |   requirements.txt
    |   stocks.py
    |   ticker_list.csv
    |   
    \---__pycache__
            app.cpython-313.pyc
            stocks.cpython-311.pyc
            stocks.cpython-313.pyc
            

