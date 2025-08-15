<?php
$host = "sqlXXX.infinityfree.com"; // Replace with your InfinityFree host
$user = "epiz_XXXXXX"; // Your DB username
$pass = "your_password"; 
$dbname = "epiz_XXXXXX_database"; 

$conn = new mysqli($host, $user, $pass, $dbname);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
?>
