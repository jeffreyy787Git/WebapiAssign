export const article = {
  "$schema":"http://json-schema.org/draft-04/schema#",
  "id": "/article",
  "title": "Article",
  "description": "An article in the blog",
  "type": "object",
  "properties": {
    "title":{
      "description": "Main title of the blog article",
      "type": "string"
    },
    "alltext":{
      "description": "Body text",
      "type": "string"
    },
    "summary":{
      "description": "Optional short text summary of article",
      "type": "string"
    },
    "imageurl":{
      "description": "URL for main image to show in article",
      "type": "uri"
    },
    "published":{
      "description": "Is the article published or not",
      "type": "boolean"
    },
    "authorid":{
      "description": "User ID of the article author",
      "type": "integer",
      "minimum": 0
    }
  },
  "required":["title", "alltext", "authorid"]
}