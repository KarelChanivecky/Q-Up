import React from 'react';
// import { Link } from 'react-router-dom';
import Footer from 'src/components/static/Footer';
import Header from 'src/components/static/Header';
import ConsumerNav from 'src/components/consumerNav';

export default function ClientDashboardPage() {
    return <>
    <Header Nav={ConsumerNav}/>
        <main>
        </main>
    <Footer/>
    </>;
}