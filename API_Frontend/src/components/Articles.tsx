import React from 'react';
import { Link } from 'react-router-dom';
import { Card, Col, Row, Spin } from 'antd';
//import articles from './articles.json';
import { api } from './common/http-common';
import axios from 'axios';
import {LoadingOutlined} from '@ant-design/icons';

const Article = () => {
  const [articles, setArticles] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(()=>{
    axios.get(`${api.uri}/articles`)
      .then((res)=>{
        setArticles(res.data);
      })
      .then(()=>{
        setLoading(false);
      })
  }, []);

  if(loading){
    const antIcon = <LoadingOutlined style={{ fontSize: 48}} spin />
    return(<Spin indicator={antIcon} />);
  } else {
    if(!articles){
      return(<div>There is no article available now.</div>)
    } else {
      return(
        <Row>
          {
            articles && articles.map(({id, title, alltext,imageurl})=> (
              <Col span={8} key={id}>
                <Card title={title} style={{width: 300}}
                cover={<img alt="example" src={imageurl} />} hoverable>
                  <p>{alltext}</p>
                  <p></p>
                  <Link to= {`/a/${id}`}>Details</Link>
                </Card>
              </Col>
            ))
          }
        </Row>
      )
    }
  }
}

export default Article;