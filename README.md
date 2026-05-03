# RankMyStocks

RankMyStocks is a full-stack stock portfolio app that helps users build, save, compare, and rank portfolios using live stock data, market news, and AI-generated stock insights.

## Features

- Create portfolios through a stock comparison questionnaire
- View saved portfolios with value and performance tracking
- Rank portfolios by value, holdings, or percentage change
- Search stocks and view key fundamentals
- Read live market news with ticker and category filters
- Get AI-generated daily stock summaries

## Tech Stack

- React
- Vite
- Flask
- MySQL
- Auth0
- yfinance
- OpenAI / LangChain

## How to Run

### Backend

```bash
cd server
pip install -r requirements.txt
python app.py
```

The Flask API runs on `http://localhost:5002`.

### Frontend

```bash
cd client
npm install
npm run dev
```

The React app runs on `http://localhost:5001`.

## Environment Variables

Create a `.env` file for the backend with your database and API credentials, such as:

```env
DB_HOST=
DB_USER=
DB_PASSWORD=
DB_NAME=
DB_PORT=
API_KEY=
```

Create a `.env` file in `client` for frontend configuration:

```env
VITE_API_URL=http://localhost:5002
```
