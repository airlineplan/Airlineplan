import { Box, Button, Stack } from '@mui/material'
import React from 'react'

const Header = () => {
  return (
    <Box sx={{ bgcolor: '#1976d2', height: '55px', display: 'flex', alignItems: 'center', gap: '20px',paddingX: '5%' }}>
      <Button sx={{ textTransform: 'capitalize', color: 'white' }}>Dashboard</Button>
      <Button sx={{ textTransform: 'capitalize', color: 'white' }}>FLGTs</Button>
    </Box>
  )
}

export default Header
