import React from 'react';
import articles from './articles.json';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from 'antd';

const DetailArticle = () => {
  const { aid } = useParams();
  const navigate= useNavigate();
  for(var article of articles) { 
    console.log('article ', article)
    console.log('aid ', aid)
    console.log('article.id ',  article.id)
    if(article.id == aid) {
      return (
        <>
          <h1>{article.title}</h1>
          <p>{article.fullText}</p>          
          
          <Button type="primary" onClick={()=>navigate(-1)}>Back</Button>
        </>
      );
      break;
    } //else {
     // return (<p>Local Store: {localStorage.getItem('atoken')}</p>)
    //}
  }
  
}

export default DetailArticle;