# AI_QAv1.0
This is the first version of a question and answer bot that utilizes OpenAI's API to query a PostgreSQL database.
- Assumes you have a PostgreSQL databse initalized
- Add a folder named 'UserDocs' to the project and place all PDFs within.
- Ensure that you have adjusted all .env variables to match your own keys/passwords
- run using 'node qa.js'
- Wait for 'Store loaded' to appear in the console before asking questions
    - NOTE: the time for this varies depending on size of database.
- Upon successful compilation, a webpage should automatically open and you can ask questions based on relevant information.
