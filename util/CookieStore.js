
const cookieStore = async (cookie) => {
    const document = {
        cookie
        }
        try {
        const response = await fetch(`${API_URL}/cookieStore`, {
            method: 'POST',
            credentials: 'include', 
            headers: {
            'Content-Type': 'application/json',
            },
            body: JSON.stringify(document),
        })
        if (!response.ok) {
            throw new Error(`HTTP error sending data to server! \n **************************\nstatus: ${response.status}`);
        }
        const data = await response.json();
        console.log(data)
        } catch (error) {
        console.error('There was a problem with the fetch operation:', error)
        }
}
export default cookieStore