# Library Books REST API Design

A RESTful API specification for managing a library's book collection.

---

## Endpoints

- **List All Books**
  - **Method**: `GET`
  - **Path**: `/api/v1/books`
  - **Description**: Retrieves a complete collection of all books stored in the library repository.
  - **Request Body**: _None_
  - **Success Status Code**: `200 OK`

- **Search Books by Author**
  - **Method**: `GET`
  - **Path**: `/api/v1/books?author=Grace+Ogot`
  - **Description**: Filters and retrieves books written by a specific author passed via a query parameter.
  - **Request Body**: _None_
  - **Success Status Code**: `200 OK`

- **Get One Book**
  - **Method**: `GET`
  - **Path**: `/api/v1/books/:id`
  - **Description**: Fetches detailed information for a single book identified by its unique ID.
  - **Request Body**: _None_
  - **Success Status Code**: `200 OK`

- **Create a Book**
  - **Method**: `POST`
  - **Path**: `/api/v1/books`
  - **Description**: Adds a new book entry to the library collection.
  - **Request Body**:
    ```json
    {
      "title": "The Other Woman",
      "author": "Grace Ogot",
      "isbn": "978-9966469885",
      "publishedYear": 1976
    }
    ```
  - **Success Status Code**: `201 Created`

- **Update a Book**
  - **Method**: `PUT`
  - **Path**: `/api/v1/books/:id`
  - **Description**: Updates all details of an existing book identified by its ID.
  - **Request Body**:
    ```json
    {
      "title": "The Other Woman and Other Stories",
      "author": "Grace Ogot",
      "isbn": "978-9966469885",
      "publishedYear": 1992
    }
    ```
  - **Success Status Code**: `200 OK`

- **Delete a Book**
  - **Method**: `DELETE`
  - **Path**: `/api/v1/books/:id`
  - **Description**: Permanently removes a book entry from the library by its ID.
  - **Request Body**: _None_
  - **Success Status Code**: `204 No Content`

---

## Error Handling

- **`400 Bad Request`**: Triggered when sending a `POST /api/v1/books` request where a required field (such as `title`) is omitted or the payload JSON is malformed.
- **`404 Not Found`**: Triggered when attempting a `GET /api/v1/books/999` or `DELETE /api/v1/books/999` request for a book ID that does not exist in the database.
