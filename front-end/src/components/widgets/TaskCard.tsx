import React, { forwardRef, useCallback, useEffect, useState } from 'react';
import {
	Button,
	Card,
	CardActionArea,
	CardActions,
	CardContent,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	IconButton,
	List,
	ListItem,
	ListItemButton,
	ListItemText,
	Stack,
	Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { DetailDialogProps, TaskCardProps } from '@/@types/props';
import Styled from './Styled';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import Folder from './Folder';
import FileUploader from './FileUploader';
import { FileList } from '../home/Project/Detail';
import { formatLongStr, toFormData, toFullName } from '@/utils';
import http from '@/utils/http';
import useNotification from '@/hooks/useNotification';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';

const TaskCard: React.ForwardRefRenderFunction<HTMLDivElement, TaskCardProps> = (
	{ data, sx, clickable = false, deleteable = true, onDelete, ...rest },
	ref
) => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [open, setOpen] = useState<boolean>(false);

	const content = (
		<CardContent sx={{ flex: 1, height: '100%' }}>
			<Stack spacing={1} sx={{ height: '100%' }}>
				<Typography variant='h6' component='h2'>
					{data.name}
				</Typography>
				<Typography variant='body2' color='text.secondary' className='collapse'>
					{formatLongStr(data.description)}
				</Typography>
				<Stack marginTop='auto!important' direction='row' alignItems='center' justifyContent='space-between'>
					<Styled.Status label={data.status} />
					<Styled.AvatarGroup data={data.members} />
				</Stack>
				<Stack direction='row' spacing={1}>
					<Typography color='primary' variant='body2' component='span'>
						{t('dueTime')}
					</Typography>
					<Typography variant='body2' component='span'>
						{dayjs(+data.dueTime).format('L LT')}
					</Typography>
				</Stack>
			</Stack>
		</CardContent>
	);

	return (
		<>
			<Card {...rest} ref={ref} sx={{ width: '100%', minWidth: 240, ...sx, display: 'flex', flexDirection: 'column' }}>
				{clickable ? (
					<CardActionArea sx={{ flex: 1 }} onClick={() => navigate(`/home/project/${data.project}`)}>
						{content}
					</CardActionArea>
				) : (
					content
				)}
				<Divider />
				<CardActions>
					<Button color='primary' onClick={() => setOpen(true)}>
						{t('detail')}
					</Button>
					{data.status !== 'Done' && deleteable && onDelete && (
						<IconButton color='error' sx={{ ml: 'auto!important' }} onClick={() => onDelete(data._id)}>
							<DeleteOutlineOutlinedIcon color='inherit' />
						</IconButton>
					)}
				</CardActions>
			</Card>
			<DetailDialog open={open} onClose={() => setOpen(false)} data={data} />
		</>
	);
};

const DetailDialog: React.FC<DetailDialogProps> = ({ open, onClose, data }) => {
	const { t } = useTranslation();
	const notificate = useNotification();
	const [existFiles, setExistFiles] = useState<string[]>(data.attachments);
	const [selectedFile, setSelectedFile] = useState<File[]>([]);

	const getFileList = useCallback(() => {
		http.get<string[]>('/task/attachments/list', { id: data._id }).then(res => {
			setExistFiles(res.data!);
		});
	}, []);

	useEffect(() => {
		getFileList();
	}, []);

	const handleFileSelect = (files: File[]) => {
		setSelectedFile(preVal => [...preVal, ...files]);
	};

	const handleDelete = (index: number) => {
		setSelectedFile(preVal => {
			preVal.splice(index, 1);
			return [...preVal];
		});
	};

	const handleUpload = () => {
		const formData = toFormData({ id: data._id });
		selectedFile.forEach(item => formData.append('file', item));
		http
			.post('/task/attachments', formData)
			.then(res => {
				notificate.success(res.message);
				setSelectedFile([]);
				getFileList();
			})
			.catch(err => notificate.error(err?.message ?? err));
	};

	return (
		<Styled.Dialog open={open} onClose={onClose}>
			<DialogTitle>
				<Stack direction='row'>
					<Styled.Status sx={{ mr: 1 }} label={data.status} />
					{data.name}
				</Stack>
			</DialogTitle>
			<DialogContent>
				<Stack spacing={2}>
					<Typography variant='body2' color='text.secondary'>
						{data.description}
					</Typography>
					<List dense sx={{ height: '100%', overflow: 'auto' }}>
						{data.members.map(member => (
							<ListItem key={member._id} disablePadding>
								<Styled.AccountInfo {...member} component={ListItemButton}>
									<ListItemText primary={toFullName(member.firstName, member.lastName)} secondary={member.role?.name} />
								</Styled.AccountInfo>
							</ListItem>
						))}
					</List>
					<Stack>
						{['createTime', 'dueTime'].map(item => (
							<Stack key={item} direction='row' spacing={1}>
								<Typography color='primary' variant='body2' component='span'>
									{t(item)}
								</Typography>
								<Typography variant='body2' component='span'>
									{dayjs(+(data as any)[item]).format('L LT')}
								</Typography>
							</Stack>
						))}
					</Stack>
					{Boolean(existFiles?.length) && <Folder filesUrl={existFiles} />}
					{data.status !== 'Done' && <FileUploader size={2} onFileSelected={handleFileSelect} />}
					<FileList files={selectedFile} onDelete={handleDelete} />
				</Stack>
			</DialogContent>
			{Boolean(selectedFile.length) && (
				<DialogActions>
					<Button onClick={handleUpload} variant='contained'>
						{t('button.upload')}
					</Button>
				</DialogActions>
			)}
		</Styled.Dialog>
	);
};

export default forwardRef(TaskCard);
